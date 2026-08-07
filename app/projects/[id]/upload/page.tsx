import { notFound, redirect } from "next/navigation";
import { DocumentUpload } from "@/components/document-upload";
import { UploadedDocuments, type UploadedDocument } from "@/components/uploaded-documents";
import { ProjectProgress } from "@/components/project-progress";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireCurrentCompany } from "@/lib/current-company";

export const dynamic = "force-dynamic";

type UploadPageProps = {
  params: Promise<{ id: string }>;
};

export default async function UploadPage({ params }: UploadPageProps) {
  const { id } = await params;
  const company = await requireCurrentCompany();
  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return (
      <main className="upload-page"><section className="upload-panel"><h1>연결 설정이 필요합니다</h1><p>Supabase 환경 변수를 추가한 뒤 다시 시도해 주세요.</p></section></main>
    );
  }

  const [{ data: project }, { data: documents }] = await Promise.all([
    supabase.from("projects").select("id, company_name, target_year, status").eq("id", id).eq("company_id", company.id).maybeSingle(),
    supabase
      .from("documents")
      .select("id, file_name, size_bytes, parse_status, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!project) notFound();
  if (project.status === "completed") redirect(`/projects/${id}/report`);
  const rows = (documents ?? []) as UploadedDocument[];

  return (
    <main className="upload-page">
      <section className="upload-panel">
        <ProjectProgress activeStep={2} projectId={project.id} />
        <header className="upload-header">
          <div>
            <p>02 / BILL UPLOAD</p>
            <h1>{project.company_name} · {project.target_year}</h1>
            <span>전기요금 고지서를 올리면 다음 단계에서 사용량을 추출합니다.</span>
          </div>
        </header>

        <DocumentUpload projectId={project.id} />

        <UploadedDocuments documents={rows} projectId={project.id} />

        <footer className="upload-footer">
          <span>{rows.some((row) => row.parse_status === "completed") ? "추출이 끝난 고지서를 검토할 수 있습니다." : "업로드 목록을 확인한 뒤 사용량 추출을 시작해 주세요."}</span>
          {rows.some((row) => row.parse_status === "completed") ? <a className="upload-review-link" href={`/projects/${project.id}/review`}>추출 결과 확인하기</a> : <button disabled type="button">추출 결과 확인하기</button>}
        </footer>
      </section>
    </main>
  );
}
