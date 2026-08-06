import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return Response.json(
      { status: "configuration_required", message: "Supabase server configuration is required." },
      { status: 503 },
    );
  }

  const { error } = await supabase.from("projects").select("id").limit(1);
  if (error) {
    return Response.json({ status: "connection_error", code: error.code }, { status: 503 });
  }

  return Response.json({ status: "ok" });
}
