import { NewProjectForm } from "@/components/new-project-form";
import { requireCurrentCompany } from "@/lib/current-company";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export default async function Home() {
  const company = await requireCurrentCompany();
  const supabase = createSupabaseAdminClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, target_year, status, created_at")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(3);
  return <NewProjectForm companyName={company.company_name} existingProjects={projects ?? []} />;
}
