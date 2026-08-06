import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  const { id: projectId, documentId } = await params;
  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return Response.json({ error: "Supabase 서버 설정이 필요합니다." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("documents")
    .update({ parse_status: "pending", uploaded_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("project_id", projectId)
    .select("id")
    .maybeSingle();

  if (error || !data) return Response.json({ error: "파일 기록을 찾을 수 없습니다." }, { status: 404 });
  return Response.json({ status: "ok" });
}
