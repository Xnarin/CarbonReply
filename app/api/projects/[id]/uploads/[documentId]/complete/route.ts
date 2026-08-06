import { getCurrentCompany } from "@/lib/current-company";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id: projectId, documentId } = await params;
  const company = await getCurrentCompany();
  if (!company) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const supabase = createSupabaseAdminClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("company_id", company.id)
    .maybeSingle();
  if (!project) return Response.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });

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
