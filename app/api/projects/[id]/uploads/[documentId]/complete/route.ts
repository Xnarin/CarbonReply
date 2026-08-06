import { getCurrentCompany } from "@/lib/current-company";
import { extractElectricityBill } from "@/lib/gemini";
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

  const { data: document, error } = await supabase
    .from("documents")
    .update({ parse_status: "pending", uploaded_at: new Date().toISOString() })
    .eq("id", documentId)
    .eq("project_id", projectId)
    .select("id, storage_path")
    .maybeSingle();
  if (error || !document) return Response.json({ error: "파일 기록을 찾을 수 없습니다." }, { status: 404 });

  try {
    const { data: file, error: downloadError } = await supabase.storage.from("electricity-bills").download(document.storage_path);
    if (downloadError || !file) throw downloadError ?? new Error("Uploaded PDF is unavailable.");
    const extracted = await extractElectricityBill(await file.arrayBuffer());
    const month = `${extracted.billingYear}-${String(extracted.billingMonth).padStart(2, "0")}-01`;
    const { data: existingActivity } = await supabase.from("monthly_activity").select("id").eq("project_id", projectId).eq("month", month).maybeSingle();
    if (existingActivity) {
      await supabase.from("documents").update({ parse_status: "failed", parsed_month: month, parsed_kwh: extracted.usageKwh }).eq("id", documentId).eq("project_id", projectId);
      return Response.json({ error: "같은 청구월의 고지서가 이미 있습니다. 기존 파일을 삭제하거나 이 파일을 삭제해 교체해 주세요.", code: "duplicate_month", month }, { status: 409 });
    }
    const { error: activityError } = await supabase.from("monthly_activity").insert(
      { project_id: projectId, month, kwh: extracted.usageKwh, source: "gemini", confirmed: false },
    );
    if (activityError) throw activityError;
    const { error: documentError } = await supabase.from("documents").update({
      parse_status: "completed",
      parsed_month: month,
      parsed_kwh: extracted.usageKwh,
    }).eq("id", documentId);
    if (documentError) throw documentError;
    await supabase.from("projects").update({ status: "reviewing" }).eq("id", projectId).eq("company_id", company.id);
    return Response.json({ status: "completed", month, kwh: extracted.usageKwh });
  } catch (parseError) {
    console.error("[upload:extract] Bill extraction failed", { documentId, error: String(parseError) });
    await supabase.from("documents").update({ parse_status: "failed" }).eq("id", documentId).eq("project_id", projectId);
    return Response.json({ error: "고지서에서 사용량을 읽지 못했습니다. 다른 PDF로 다시 시도해 주세요." }, { status: 422 });
  }
}
