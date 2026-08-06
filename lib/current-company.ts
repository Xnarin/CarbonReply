import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseAuthClient } from "@/lib/supabase/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type CurrentCompany = { id: string; company_name: string; auth_user_id: string };

export async function getCurrentCompany(): Promise<CurrentCompany | null> {
  const authClient = await createSupabaseAuthClient();
  const { data } = await authClient.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const admin = createSupabaseAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("id, company_name, auth_user_id")
    .eq("auth_user_id", userId)
    .maybeSingle();
  return company as CurrentCompany | null;
}

export async function requireCurrentCompany() {
  const company = await getCurrentCompany();
  if (!company) redirect("/login");
  return company;
}
