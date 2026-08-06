import { getCurrentCompany } from "@/lib/current-company";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id: projectId, documentId } = await params;
  const company = await getCurrentCompany();
  if (!company) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("company_id", company.id).maybeSingle();
  if (!project) return Response.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });

  const { data: document } = await supabase.from("documents").select("storage_path").eq("id", documentId).eq("project_id", projectId).maybeSingle();
  if (!document) return Response.json({ error: "원본 고지서를 찾을 수 없습니다." }, { status: 404 });
  if (new URL(request.url).searchParams.get("raw") === "1") {
    const { data: file, error: downloadError } = await supabase.storage.from("electricity-bills").download(document.storage_path);
    if (downloadError || !file) return Response.json({ error: "원본 고지서를 불러오지 못했습니다." }, { status: 500 });
    return new Response(file, { headers: { "Cache-Control": "private, no-store", "Content-Type": "application/pdf" } });
  }
  const { data, error } = await supabase.storage.from("electricity-bills").createSignedUrl(document.storage_path, 300);
  if (error || !data?.signedUrl) return Response.json({ error: "원본 고지서를 열지 못했습니다." }, { status: 500 });
  return Response.redirect(data.signedUrl);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id: projectId, documentId } = await params;
  const company = await getCurrentCompany();
  if (!company) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase.from("projects").select("id, status").eq("id", projectId).eq("company_id", company.id).maybeSingle();
  if (!project) return Response.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  if (project.status === "completed") return Response.json({ error: "확정된 결과의 고지서는 변경할 수 없습니다." }, { status: 409 });

  const { data: document } = await supabase.from("documents").select("id, storage_path, parsed_month, parse_status").eq("id", documentId).eq("project_id", projectId).maybeSingle();
  if (!document) return Response.json({ error: "파일을 찾을 수 없습니다." }, { status: 404 });

  const { error: deleteError } = await supabase.from("documents").delete().eq("id", document.id).eq("project_id", projectId);
  if (deleteError) return Response.json({ error: "파일 기록을 삭제하지 못했습니다." }, { status: 500 });
  await supabase.storage.from("electricity-bills").remove([document.storage_path]);

  if (document.parse_status === "completed" && document.parsed_month) {
    await supabase.from("monthly_activity").delete().eq("project_id", projectId).eq("month", document.parsed_month);
  }
  const { count } = await supabase.from("monthly_activity").select("id", { count: "exact", head: true }).eq("project_id", projectId);
  if (count === 0) await supabase.from("projects").update({ status: "draft" }).eq("id", projectId).eq("company_id", company.id);
  return Response.json({ status: "deleted" });
}
