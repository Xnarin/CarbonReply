import { notFound } from "next/navigation";
import { DocumentUpload } from "@/components/document-upload";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { requireCurrentCompany } from "@/lib/current-company";
import { signOut } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

type UploadPageProps = {
  params: Promise<{ id: string }>;
};

type DocumentRow = {
  id: string;
  file_name: string;
  size_bytes: number;
  parse_status: "uploading" | "pending" | "completed" | "failed";
  created_at: string;
};

function formatSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
}

function statusLabel(status: DocumentRow["parse_status"]) {
  return { uploading: "업로드 중", pending: "추출 대기", completed: "추출 완료", failed: "확인 필요" }[status];
}

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
    supabase.from("projects").select("id, company_name, target_year").eq("id", id).eq("company_id", company.id).maybeSingle(),
    supabase
      .from("documents")
      .select("id, file_name, size_bytes, parse_status, created_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!project) notFound();
  const rows = (documents ?? []) as DocumentRow[];

  return (
    <main className="upload-page">
      <section className="upload-panel">
        <header className="upload-header">
          <div>
            <p>02 / BILL UPLOAD</p>
            <h1>{project.company_name} · {project.target_year}</h1>
            <span>전기요금 고지서를 올리면 다음 단계에서 사용량을 추출합니다.</span>
          </div>
          <div className="upload-actions">
            <a href="/" className="back-link">새 프로젝트</a>
            <form action={signOut}><button className="logout-button" type="submit">로그아웃</button></form>
          </div>
        </header>

        <DocumentUpload projectId={project.id} />

        <section className="uploaded-files" aria-labelledby="uploaded-files-title">
          <div className="uploaded-files-heading">
            <h2 id="uploaded-files-title">업로드된 고지서 <b>{rows.length}</b></h2>
            <span>업로드 후 자동 추출을 준비합니다.</span>
          </div>
          <div className="document-table-wrap">
            <table>
              <thead><tr><th>파일</th><th>용량</th><th>상태</th><th>업로드 시각</th></tr></thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={4} className="document-empty">아직 업로드된 고지서가 없습니다.</td></tr>
                ) : rows.map((document) => (
                  <tr key={document.id}>
                    <td>{document.file_name}</td>
                    <td>{formatSize(document.size_bytes)}</td>
                    <td><span className={`status-pill status-${document.parse_status}`}>{statusLabel(document.parse_status)}</span></td>
                    <td>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(document.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="upload-footer">
          <span>{rows.length === 0 ? "고지서를 먼저 업로드해 주세요." : "고지서 업로드가 완료되었습니다."}</span>
          {rows.length === 0 ? <button disabled type="button">추출 결과 확인하기</button> : <a className="upload-review-link" href={`/projects/${project.id}/review`}>추출 결과 확인하기</a>}
        </footer>
      </section>
    </main>
  );
}
