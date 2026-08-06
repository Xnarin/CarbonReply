"use server";

import { redirect } from "next/navigation";
import { requireCurrentCompany } from "@/lib/current-company";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type ProjectFormState = { error?: string };
export const initialProjectState: ProjectFormState = {};

export async function createProject(_: ProjectFormState, formData: FormData): Promise<ProjectFormState> {
  const targetYear = Number(formData.get("targetYear"));
  const currentYear = new Date().getFullYear();
  const company = await requireCurrentCompany();
  if (!Number.isInteger(targetYear) || targetYear < currentYear - 10 || targetYear > currentYear) {
    return { error: "올바른 산정 연도를 선택해 주세요." };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ company_id: company.id, company_name: company.company_name, target_year: targetYear })
    .select("id")
    .single();
  if (error || !data) return { error: "프로젝트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." };
  redirect(`/projects/${data.id}/upload`);
}
