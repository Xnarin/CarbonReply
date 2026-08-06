"use server";

import { randomBytes, randomUUID } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAuthClient } from "@/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type AuthState = { error?: string; emailSent?: string; companyName?: string };

function companyNameFrom(formData: FormData) { return String(formData.get("companyName") ?? "").trim().replace(/\s+/g, " "); }
function emailFrom(formData: FormData) { return String(formData.get("email") ?? "").trim().toLowerCase(); }
function validEmail(email: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

async function passwordSetupUrl() {
  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://carbon-reply.vercel.app";
  return `${origin}/auth/confirm?next=/reset`;
}

export async function registerCompany(_: AuthState, formData: FormData): Promise<AuthState> {
  const companyName = companyNameFrom(formData);
  const email = emailFrom(formData);
  if (companyName.length < 2 || companyName.length > 120) return { error: "회사명은 2~120자로 입력해 주세요." };
  if (!validEmail(email)) return { error: "담당자 이메일을 정확히 입력해 주세요." };

  const admin = createSupabaseAdminClient();
  const [{ data: existingCompany }, { data: existingEmail }] = await Promise.all([
    admin.from("companies").select("id").ilike("company_name", companyName).maybeSingle(),
    admin.from("companies").select("id").eq("contact_email", email).maybeSingle(),
  ]);
  if (existingCompany || existingEmail) return { error: "이미 등록된 회사명 또는 이메일입니다. 로그인해 주세요." };

  const companyId = randomUUID();
  const { data: authData, error: authError } = await admin.auth.admin.createUser({ email, password: randomBytes(24).toString("base64url"), email_confirm: true });
  if (authError || !authData.user) {
    console.error("[auth:register] Supabase user creation failed", {
      code: authError?.code,
      name: authError?.name,
      status: authError?.status,
    });
    return { error: "계정을 만들지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  const { error: companyError } = await admin.from("companies").insert({ id: companyId, company_name: companyName, contact_email: email, auth_user_id: authData.user.id });
  if (companyError) {
    console.error("[auth:register] Company record creation failed", {
      code: companyError.code,
      message: companyError.message,
    });
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: "회사 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }

  const authClient = await createSupabaseAuthClient();
  const { error: emailError } = await authClient.auth.resetPasswordForEmail(email, { redirectTo: await passwordSetupUrl() });
  if (emailError) {
    console.error("[auth:register] Password setup email failed", {
      code: emailError.code,
      name: emailError.name,
      status: emailError.status,
    });
    await admin.from("companies").delete().eq("id", companyId);
    await admin.auth.admin.deleteUser(authData.user.id);
    return { error: "비밀번호 설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요." };
  }
  return { emailSent: email, companyName };
}

export async function signInCompany(_: AuthState, formData: FormData): Promise<AuthState> {
  const companyName = companyNameFrom(formData);
  const password = String(formData.get("password") ?? "");
  if (!companyName || !password) return { error: "회사명과 비밀번호를 입력해 주세요." };
  const admin = createSupabaseAdminClient();
  const { data: company } = await admin.from("companies").select("contact_email").ilike("company_name", companyName).maybeSingle();
  if (!company) return { error: "회사명 또는 비밀번호를 확인해 주세요." };
  const authClient = await createSupabaseAuthClient();
  const { error } = await authClient.auth.signInWithPassword({ email: company.contact_email, password });
  if (error) return { error: "회사명 또는 비밀번호를 확인해 주세요." };
  redirect("/");
}
