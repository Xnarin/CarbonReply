"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentCompany } from "@/lib/current-company";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { calculateElectricityEmissionsKg, getElectricityFactor } from "@/lib/emission-factor";
import { analyzeMonthlyUsage, isValidUsageKwh } from "@/lib/bill-validation";

export async function confirmMonthlyUsage(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const month = String(formData.get("month") ?? "");
  const kwh = Number(formData.get("kwh"));
  if (!projectId || !/^\d{4}-\d{2}-01$/.test(month) || !isValidUsageKwh(kwh)) return;

  const company = await getCurrentCompany();
  if (!company) return;
  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase.from("projects").select("id, target_year").eq("id", projectId).eq("company_id", company.id).maybeSingle();
  if (!project || !month.startsWith(`${project.target_year}-`)) return;

  await supabase.from("monthly_activity").update({ kwh, confirmed: true }).eq("project_id", projectId).eq("month", month);
  revalidatePath(`/projects/${projectId}/review`);
  revalidatePath(`/projects/${projectId}/report`);
}

export async function confirmAllMonthlyUsage(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return;
  const company = await getCurrentCompany();
  if (!company) return;
  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase.from("projects").select("id, target_year").eq("id", projectId).eq("company_id", company.id).maybeSingle();
  if (!project) return;

  const { data: activities } = await supabase.from("monthly_activity").select("month, kwh, confirmed").eq("project_id", projectId);
  if (!activities?.length) return;
  const validation = analyzeMonthlyUsage(activities, project.target_year);
  const warningMonths = new Set([...validation.invalidMonths, ...validation.outlierMonths, ...validation.zeroUsageMonths]);
  if (activities.some((activity) => warningMonths.has(activity.month) && !activity.confirmed)) return;

  await supabase.from("monthly_activity").update({ confirmed: true }).eq("project_id", projectId);
  revalidatePath(`/projects/${projectId}/review`);
  revalidatePath(`/projects/${projectId}/report`);
}

export async function completeProjectAndReturn(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return;
  const company = await getCurrentCompany();
  if (!company) return;
  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase.from("projects").select("id, target_year").eq("id", projectId).eq("company_id", company.id).maybeSingle();
  if (!project) return;
  const { data: activities } = await supabase.from("monthly_activity").select("month, kwh, confirmed").eq("project_id", projectId);
  if (!activities?.length || activities.some((activity) => !activity.confirmed)) return;

  const validation = analyzeMonthlyUsage(activities, project.target_year);
  if (validation.invalidMonths.length > 0) return;

  const totalKwh = activities.reduce((sum, activity) => sum + Number(activity.kwh), 0);
  const factor = getElectricityFactor(project.target_year);
  const totalTco2e = calculateElectricityEmissionsKg(totalKwh, project.target_year) / 1000;
  await supabase.from("reports").upsert({ project_id: projectId, total_kwh: totalKwh, total_tco2e: totalTco2e, grade: validation.grade, factor_value: factor.value, factor_version: factor.version, calculated_at: new Date().toISOString() }, { onConflict: "project_id" });
  await supabase.from("projects").update({ status: "completed" }).eq("id", projectId).eq("company_id", company.id);
  revalidatePath("/");
  redirect("/");
}
