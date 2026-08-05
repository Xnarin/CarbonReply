"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProjectFormState = {
  error?: string;
};

export const initialProjectState: ProjectFormState = {};

export async function createProject(
  _previousState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const targetYear = Number(formData.get("targetYear"));
  const currentYear = new Date().getFullYear();

  if (!companyName) {
    return { error: "회사명을 입력해 주세요." };
  }

  if (!Number.isInteger(targetYear) || targetYear < currentYear - 10 || targetYear > currentYear) {
    return { error: "올바른 산정 연도를 선택해 주세요." };
  }

  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch {
    return { error: "Supabase 연결 정보가 아직 설정되지 않았습니다." };
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({ company_name: companyName, target_year: targetYear })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "프로젝트를 저장하지 못했습니다. 데이터베이스 설정을 확인해 주세요." };
  }

  redirect(`/projects/${data.id}/upload`);
}
