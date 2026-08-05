import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return Response.json({
      status: "configuration_required",
      message: "Supabase 환경 변수를 설정해 주세요.",
    });
  }

  const supabase = createClient(url, publishableKey);
  const { error } = await supabase.from("projects").select("id").limit(1);

  if (error) {
    return Response.json(
      {
        status: "connection_error",
        message: "Supabase 연결 또는 스키마를 확인해 주세요.",
        code: error.code,
      },
      { status: 503 },
    );
  }

  return Response.json({ status: "ok" });
}
