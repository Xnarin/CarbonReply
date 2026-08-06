import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAuthClient } from "@/lib/supabase/auth";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next")?.startsWith("/") ? request.nextUrl.searchParams.get("next")! : "/reset";
  const supabase = await createSupabaseAuthClient();
  const error = tokenHash && type
    ? (await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error
    : code ? (await supabase.auth.exchangeCodeForSession(code)).error : new Error("Invalid recovery link");
  return NextResponse.redirect(new URL(error ? "/login" : next, request.url));
}
