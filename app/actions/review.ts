"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentCompany } from "@/lib/current-company";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getElectricityFactor } from "@/lib/emission-factor";
import { analyzeMonthlyUsage, formatMonthNumbers, isValidBillUsageKwh } from "@/lib/bill-validation";
import { getFinalizationReadiness } from "@/lib/workflow-validation";

function describeValidation(activities: Array<{ month: string; kwh: number; confirmed: boolean }>, targetYear: number) {
  const validation = analyzeMonthlyUsage(activities, targetYear);
  if (validation.grade === "A") return "12개월 자료 완비 · 통계적 주의값 없음";
  if (validation.grade === "B") return `누락 ${validation.missingMonths.length}개월 (${formatMonthNumbers(validation.missingMonths)})`;
  return `주의 사용량 ${validation.outlierMonths.length + validation.zeroUsageMonths.length}건 원본 대조 완료`;
}

/** Save a corrected monthly value. Final confirmation is handled only at project level. */
export async function saveMonthlyUsage(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const month = String(formData.get("month") ?? "");
  const kwh = Number(formData.get("kwh"));
  if (!projectId || !/^\d{4}-\d{2}-01$/.test(month) || !isValidBillUsageKwh(kwh)) return { ok: false };

  const company = await getCurrentCompany();
  if (!company) return { ok: false };
  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase.from("projects").select("id, target_year, status").eq("id", projectId).eq("company_id", company.id).maybeSingle();
  if (!project || project.status === "completed" || !month.startsWith(`${project.target_year}-`)) return { ok: false };

  // Changing a value requires a fresh, project-level final confirmation.
  const { error } = await supabase.from("monthly_activity").update({ kwh, confirmed: false }).eq("project_id", projectId).eq("month", month);
  if (error) return { ok: false };
  revalidatePath(`/projects/${projectId}/review`);
  return { ok: true };
}

export async function confirmAllMonthlyUsage(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { ok: false };
  const company = await getCurrentCompany();
  if (!company) return { ok: false };
  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase.from("projects").select("id, target_year, status").eq("id", projectId).eq("company_id", company.id).maybeSingle();
  if (!project || project.status === "completed") return { ok: false };

  const { data: activities } = await supabase.from("monthly_activity").select("month, kwh, confirmed").eq("project_id", projectId);
  if (!activities?.length) return { ok: false };
  const { error } = await supabase.from("monthly_activity").update({ confirmed: true }).eq("project_id", projectId);
  if (error) return { ok: false };
  revalidatePath(`/projects/${projectId}/review`);
  return { ok: true };
}

export async function completeProjectAndReturn(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return;
  const company = await getCurrentCompany();
  if (!company) return;
  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase.from("projects").select("id, target_year, status").eq("id", projectId).eq("company_id", company.id).maybeSingle();
  if (!project) return;
  if (project.status === "completed") redirect("/");
  const { data: activities } = await supabase.from("monthly_activity").select("month, kwh, confirmed").eq("project_id", projectId);
  if (!activities?.length || activities.some((activity) => !activity.confirmed)) return;

  const readiness = getFinalizationReadiness(activities, project.target_year);
  if (!readiness.canFinalize) return;
  const validation = readiness.validation;

  const factor = getElectricityFactor(project.target_year);
  const { error } = await supabase.rpc("finalize_project_report", {
    p_project_id: projectId,
    p_company_id: company.id,
    p_grade: validation.grade,
    p_factor_value: factor.value,
    p_factor_year: factor.factorYear,
    p_factor_version: factor.version,
    p_validation_notes: describeValidation(activities, project.target_year),
  });
  if (error) {
    console.error("[report:finalize] Finalization failed", { projectId, error: error.message });
    redirect(`/projects/${projectId}/report?finalizeError=1`);
  }
  revalidatePath("/");
  revalidatePath(`/projects/${projectId}/report`);
  redirect("/");
}
