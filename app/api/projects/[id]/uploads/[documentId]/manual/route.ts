import { getCurrentCompany } from "@/lib/current-company";
import { isValidUsageKwh } from "@/lib/bill-validation";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const { id: projectId, documentId } = await params;
  const company = await getCurrentCompany();
  if (!company) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: { month?: unknown; kwh?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "보정값 형식이 올바르지 않습니다." }, { status: 400 }); }
  const month = typeof body.month === "string" ? body.month : "";
  const kwh = Number(body.kwh);
  if (!/^\d{4}-\d{2}$/.test(month) || !isValidUsageKwh(kwh)) {
    return Response.json({ error: "청구월과 0 이상 사용량(kWh)을 입력하세요." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase.from("projects").select("id, target_year, status").eq("id", projectId).eq("company_id", company.id).maybeSingle();
  if (!project) return Response.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  if (project.status === "completed") return Response.json({ error: "확정된 결과는 수정할 수 없습니다." }, { status: 409 });
  if (!month.startsWith(`${project.target_year}-`)) return Response.json({ error: `산정 연도 ${project.target_year}의 청구월만 입력할 수 있습니다.` }, { status: 409 });

  const billingMonth = `${month}-01`;
  const { data: document } = await supabase.from("documents").select("id, parse_status").eq("id", documentId).eq("project_id", projectId).maybeSingle();
  if (!document) return Response.json({ error: "고지서 파일을 찾을 수 없습니다." }, { status: 404 });
  if (document.parse_status === "completed") return Response.json({ error: "이미 추출된 고지서입니다. 검토 화면에서 값을 수정하세요." }, { status: 409 });

  const { data: duplicate } = await supabase.from("monthly_activity").select("id").eq("project_id", projectId).eq("month", billingMonth).maybeSingle();
  if (duplicate) return Response.json({ error: "같은 청구월의 사용량이 이미 있습니다. 기존 항목을 확인하세요." }, { status: 409 });

  const { error: activityError } = await supabase.from("monthly_activity").insert({ project_id: projectId, month: billingMonth, kwh, source: "manual", confirmed: false });
  if (activityError) return Response.json({ error: "보정 사용량을 저장하지 못했습니다." }, { status: 500 });
  const { error: documentError } = await supabase.from("documents").update({ parse_status: "completed", parse_error_code: null, parsed_month: billingMonth, parsed_kwh: kwh }).eq("id", documentId).eq("project_id", projectId);
  if (documentError) return Response.json({ error: "고지서 보정 상태를 저장하지 못했습니다." }, { status: 500 });
  await supabase.from("projects").update({ status: "reviewing" }).eq("id", projectId).eq("company_id", company.id);
  return Response.json({ status: "completed", month: billingMonth, kwh });
}
