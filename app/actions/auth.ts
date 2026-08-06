"use server";

import { randomBytes, randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { createSupabaseAuthClient } from "@/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type AuthState = { error?: string; issuedPassword?: string; companyName?: string };
export const initialAuthState: AuthState = {};

function companyNameFrom(formData: FormData) {
  return String(formData.get("companyName") ?? "").trim().replace(/\s+/g, " ");
}

export async function registerCompany(_: AuthState, formData: FormData): Promise<AuthState> {
  const companyName = companyNameFrom(formData);
  if (companyName.length < 2 || companyName.length > 120) return { error: "회사명은 2~120자로 입력해 주세요." };

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin.from("companies").select("id").ilike("company_name", companyName).maybeSingle();
  if (existing) return { error: "이미 발급된 회사명입니다. 로그인해 주세요." };

  const companyId = randomUUID();
  const password = randomBytes(12).toString("base64url");
  const loginEmail = `company-${companyId}@login.carbonreply.local`;
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: loginEmail,
    password,
    email_confirm: true,
  });
  if (authError || !authData.user) return { error: "비밀번호를 발급하지 못했습니다. 잠시 후 다시 시도해 주세요." };

  const { error: companyError } = await admin.from("companies").insert({
    id: companyId,
    company_name: companyName,
    login_email: loginEmail,
    auth_user_id: authData.user.id,
  });
  if (companyError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: "회사 계정을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  return { issuedPassword: password, companyName };
}

export async function signInCompany(_: AuthState, formData: FormData): Promise<AuthState> {
  const companyName = companyNameFrom(formData);
  const password = String(formData.get("password") ?? "");
  if (!companyName || !password) return { error: "회사명과 비밀번호를 입력해 주세요." };

  const admin = createSupabaseAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("login_email")
    .ilike("company_name", companyName)
    .maybeSingle();
  if (!company) return { error: "회사명 또는 비밀번호를 확인해 주세요." };

  const authClient = await createSupabaseAuthClient();
  const { error } = await authClient.auth.signInWithPassword({ email: company.login_email, password });
  if (error) return { error: "회사명 또는 비밀번호를 확인해 주세요." };
  redirect("/");
}
