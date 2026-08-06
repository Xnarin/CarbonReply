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
  const projectIds = (projects ?? []).map((project) => project.id);
  const { data: reports } = projectIds.length > 0
    ? await supabase.from("reports").select("project_id, total_kwh, total_tco2e").in("project_id", projectIds)
    : { data: [] };
  const summaries = new Map((reports ?? []).map((report) => [report.project_id, { totalKwh: Number(report.total_kwh), totalTco2e: Number(report.total_tco2e) }]));
  return <NewProjectForm companyName={company.company_name} existingProjects={(projects ?? []).map((project) => ({ ...project, summary: summaries.get(project.id) }))} />;
}
