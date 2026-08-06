import { NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getCurrentCompany } from "@/lib/current-company";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_FILES = 12;

type UploadInput = { name?: unknown; size?: unknown; type?: unknown };

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "bill.pdf";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const company = await getCurrentCompany();
  if (!company) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  let body: { files?: UploadInput[] };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 업로드 요청입니다." }, { status: 400 });
  }

  const files = body.files;
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_FILES) {
    return Response.json({ error: "파일은 한 번에 1~12개까지 올릴 수 있습니다." }, { status: 400 });
  }

  const validFiles = files.every(
    (file) =>
      typeof file.name === "string" &&
      file.name.toLowerCase().endsWith(".pdf") &&
      file.type === "application/pdf" &&
      typeof file.size === "number" &&
      Number.isFinite(file.size) &&
      file.size > 0 &&
      file.size <= MAX_FILE_SIZE,
  );
  if (!validFiles) {
    return Response.json({ error: "PDF 파일만 가능하며, 파일당 최대 20MB입니다." }, { status: 400 });
  }

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return Response.json({ error: "Supabase 서버 설정이 필요합니다." }, { status: 503 });
  }

  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("company_id", company.id).maybeSingle();
  if (!project) return Response.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });

  const documents = files.map((file) => ({
    project_id: projectId,
    storage_path: `${projectId}/${crypto.randomUUID()}-${safeFileName(file.name as string)}`,
    file_name: file.name as string,
    mime_type: "application/pdf",
    size_bytes: file.size as number,
  }));
  const { data: createdDocuments, error: insertError } = await supabase
    .from("documents")
    .insert(documents)
    .select("id, storage_path");
  if (insertError || !createdDocuments) {
    return Response.json({ error: "파일 기록을 만들지 못했습니다." }, { status: 500 });
  }

  const signedUploads = await Promise.all(
    createdDocuments.map(async (document) => {
      const { data, error } = await supabase.storage
        .from("electricity-bills")
        .createSignedUploadUrl(document.storage_path);
      if (error || !data) throw error ?? new Error("서명된 업로드 주소를 만들지 못했습니다.");
      return { documentId: document.id, path: document.storage_path, token: data.token };
    }),
  ).catch(async () => {
    await supabase.from("documents").delete().in("id", createdDocuments.map((document) => document.id));
    return null;
  });

  if (!signedUploads) return Response.json({ error: "업로드 준비에 실패했습니다." }, { status: 500 });
  return Response.json({ files: signedUploads });
}
