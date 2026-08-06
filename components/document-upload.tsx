"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type UploadTicket = {
  documentId: string;
  path: string;
  token: string;
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export function DocumentUpload({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0 || isUploading) return;
    if (files.length > 12) {
      setMessage("한 번에 최대 12개의 고지서를 올릴 수 있습니다.");
      return;
    }

    const invalidFile = files.find(
      (file) => file.type !== "application/pdf" || file.size === 0 || file.size > MAX_FILE_SIZE,
    );
    if (invalidFile) {
      setMessage("PDF 파일만 가능하며, 파일당 최대 20MB까지 올릴 수 있습니다.");
      return;
    }

    setIsUploading(true);
    setMessage("고지서를 안전하게 업로드하고 있습니다…");

    try {
      const ticketResponse = await fetch(`/api/projects/${projectId}/uploads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: files.map((file) => ({ name: file.name, size: file.size, type: file.type })),
        }),
      });
      const ticketBody = (await ticketResponse.json()) as { error?: string; files?: UploadTicket[] };
      if (!ticketResponse.ok || !ticketBody.files) {
        throw new Error(ticketBody.error ?? "업로드 준비에 실패했습니다.");
      }

      const supabase = createSupabaseBrowserClient();
      await Promise.all(
        ticketBody.files.map(async (ticket, index) => {
          const { error } = await supabase.storage
            .from("electricity-bills")
            .uploadToSignedUrl(ticket.path, ticket.token, files[index]);
          if (error) throw error;
        }),
      );

      setMessage(`${files.length}개 고지서를 업로드했습니다. 목록에서 확인한 뒤 추출을 시작해 주세요.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "업로드 중 문제가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <label className={`upload-dropzone ${isUploading ? "is-uploading" : ""}`}>
      <input accept="application/pdf" disabled={isUploading} multiple onChange={handleFiles} type="file" />
      <span className="upload-symbol" aria-hidden="true">↑</span>
      <strong>{isUploading ? "고지서를 올리고 있습니다" : "전기요금 고지서를 선택하세요"}</strong>
      <span>PDF · 파일당 최대 20MB · 한 번에 최대 12개</span>
      {message ? <small role="status">{message}</small> : null}
    </label>
  );
}
