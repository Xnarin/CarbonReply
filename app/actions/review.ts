"use server";

import { revalidatePath } from "next/cache";
import { getCurrentCompany } from "@/lib/current-company";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function confirmMonthlyUsage(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "");
  const month = String(formData.get("month") ?? "");
  const kwh = Number(formData.get("kwh"));
  if (!projectId || !/^\d{4}-\d{2}-01$/.test(month) || !Number.isFinite(kwh) || kwh < 0) return;

  const company = await getCurrentCompany();
  if (!company) return;
  const supabase = createSupabaseAdminClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).eq("company_id", company.id).maybeSingle();
  if (!project) return;

  await supabase.from("monthly_activity").update({ kwh, confirmed: true }).eq("project_id", projectId).eq("month", month);
  revalidatePath(`/projects/${projectId}/review`);
}
