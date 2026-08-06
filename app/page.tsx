import { NewProjectForm } from "@/components/new-project-form";
import { requireCurrentCompany } from "@/lib/current-company";

export default async function Home() {
  const company = await requireCurrentCompany();
  return <NewProjectForm companyName={company.company_name} />;
}
