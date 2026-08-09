"use client";

import JSZip from "jszip";
import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type UploadTicket = {
  documentId: string;
  path: string;
  token: string;
};

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_FILES = 12;
const MAX_ZIP_FILE_SIZE = 30 * 1024 * 1024;
const MAX_ZIP_UNCOMPRESSED_SIZE = 60 * 1024 * 1024;

function isPdf(file: File) {
  return file.name.toLowerCase().endsWith(".pdf") && (file.type === "application/pdf" || file.type === "");
}

function isZip(file: File) {
  return file.name.toLowerCase().endsWith(".zip") || ["application/zip", "application/x-zip-compressed"].includes(file.type);
}

function zipEntryFileName(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? "bill.pdf";
}

async function extractPdfFiles(zipFile: File): Promise<File[]> {
  if (zipFile.size === 0 || zipFile.size > MAX_ZIP_FILE_SIZE) {
    throw new Error("ZIP 파일은 최대 30MB까지 올릴 수 있습니다.");
  }

  let archive: JSZip;
  try {
    archive = await JSZip.loadAsync(zipFile, { checkCRC32: true });
  } catch {
    throw new Error("손상되었거나 비밀번호가 설정된 ZIP 파일입니다. 압축을 해제한 PDF를 올려 주세요.");
  }

  const entries = Object.values(archive.files).filter((entry) => !entry.dir && entry.name.toLowerCase().endsWith(".pdf"));
  if (entries.length === 0) throw new Error("ZIP 안에서 PDF 파일을 찾지 못했습니다.");
  if (entries.length > MAX_FILES) throw new Error("ZIP 안에는 PDF를 최대 12개까지 넣을 수 있습니다.");

  let uncompressedSize = 0;
  const files: File[] = [];
  for (const entry of entries) {
    const bytes = await entry.async("uint8array");
    uncompressedSize += bytes.byteLength;
    if (uncompressedSize > MAX_ZIP_UNCOMPRESSED_SIZE) {
      throw new Error("압축을 푼 PDF의 전체 용량은 최대 60MB까지 가능합니다.");
    }
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_FILE_SIZE) {
      throw new Error("ZIP 안의 각 PDF는 15MB 이하여야 합니다.");
    }
    const fileBytes = new Uint8Array(bytes.byteLength);
    fileBytes.set(bytes);
    files.push(new File([fileBytes.buffer], zipEntryFileName(entry.name), { type: "application/pdf" }));
  }
  return files;
}

export function DocumentUpload({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function uploadPdfFiles(files: File[]) {
    const ticketResponse = await fetch(`/api/projects/${projectId}/uploads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: files.map((file) => ({ name: file.name, size: file.size, type: file.type })) }),
    });
    const ticketBody = (await ticketResponse.json()) as { error?: string; files?: UploadTicket[] };
    if (!ticketResponse.ok || !ticketBody.files) {
      throw new Error(ticketBody.error ?? "업로드 준비에 실패했습니다.");
    }

    const supabase = createSupabaseBrowserClient();
    await Promise.all(ticketBody.files.map(async (ticket, index) => {
      const { error } = await supabase.storage.from("electricity-bills").uploadToSignedUrl(ticket.path, ticket.token, files[index]);
      if (error) throw error;
    }));
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selectedFiles.length === 0 || isUploading) return;

    setMessage("");
    let pdfFiles: File[];
    try {
      const zipFiles = selectedFiles.filter(isZip);
      if (zipFiles.length > 0) {
        if (zipFiles.length !== 1 || selectedFiles.length !== 1) {
          throw new Error("ZIP 업로드는 한 번에 ZIP 파일 하나만 선택해 주세요.");
        }
        setIsUploading(true);
        setMessage("ZIP 안의 PDF를 확인하고 있습니다.");
        pdfFiles = await extractPdfFiles(zipFiles[0]);
      } else {
        pdfFiles = selectedFiles;
      }

      if (pdfFiles.length === 0 || pdfFiles.length > MAX_FILES) {
        throw new Error("한 번에 최대 12개의 고지서 PDF를 올릴 수 있습니다.");
      }
      if (pdfFiles.some((file) => !isPdf(file) || file.size === 0 || file.size > MAX_FILE_SIZE)) {
        throw new Error("PDF 파일만 가능하며, 각 파일은 최대 15MB까지 올릴 수 있습니다.");
      }

      setIsUploading(true);
      setMessage(`${pdfFiles.length}개 PDF를 안전하게 업로드하고 있습니다.`);
      await uploadPdfFiles(pdfFiles);
      setMessage(`${pdfFiles.length}개 고지서를 업로드했습니다. 목록을 확인한 뒤 추출을 시작해 주세요.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "파일을 처리하는 중 문제가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <label className={`upload-dropzone ${isUploading ? "is-uploading" : ""}`}>
      <input accept="application/pdf,.pdf,application/zip,.zip" disabled={isUploading} multiple onChange={handleFiles} type="file" />
      <span className="upload-symbol" aria-hidden="true">↥</span>
      <strong>{isUploading ? "고지서를 준비하고 있습니다" : "전기요금 고지서 PDF 또는 ZIP을 선택하세요"}</strong>
      <span>PDF: 파일당 최대 15MB · ZIP: PDF 최대 12개, 압축 해제 후 최대 60MB</span>
      <small>ZIP을 올리면 내부 PDF만 자동으로 분리해 업로드합니다. 안내문 등 PDF가 아닌 파일은 제외됩니다.</small>
      {message ? <small className="upload-message" role="status">{message}</small> : null}
    </label>
  );
}
