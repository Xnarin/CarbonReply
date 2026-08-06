import { notFound } from "next/navigation";
import { confirmAllMonthlyUsage, confirmMonthlyUsage } from "@/app/actions/review";
import { ConfirmUsageButton } from "@/components/confirm-usage-button";
import { OriginalPdfDialog } from "@/components/original-pdf-dialog";
import { ProjectProgress } from "@/components/project-progress";
import { requireCurrentCompany } from "@/lib/current-company";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
type ReviewPageProps = { params: Promise<{ id: string }> };
type ActivityRow = { month: string; kwh: number; confirmed: boolean; source: string };
type EvidenceDocument = { id: string; file_name: string; parsed_month: string; parsed_kwh: number };
const ELECTRICITY_FACTOR = 0.4781;

function formatMonth(month: string) { return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(new Date(`${month}T00:00:00`)); }

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
  const company = await requireCurrentCompany();
  const supabase = createSupabaseAdminClient();
  const [{ data: project }, { data: activities }, { data: documents }] = await Promise.all([
    supabase.from("projects").select("id, company_name, target_year").eq("id", id).eq("company_id", company.id).maybeSingle(),
    supabase.from("monthly_activity").select("month, kwh, confirmed, source").eq("project_id", id).order("month"),
    supabase.from("documents").select("id, file_name, parsed_month, parsed_kwh").eq("project_id", id).eq("parse_status", "completed"),
  ]);
  if (!project) notFound();
  const rows = (activities ?? []) as ActivityRow[];
  const evidenceByMonth = new Map(((documents ?? []) as EvidenceDocument[]).map((document) => [document.parsed_month, document]));
  const totalKwh = rows.reduce((sum, row) => sum + Number(row.kwh), 0);
  const totalKg = totalKwh * ELECTRICITY_FACTOR;
  const confirmedCount = rows.filter((row) => row.confirmed).length;
  const canCreateReport = rows.length > 0 && confirmedCount === rows.length;

  return <main className="review-page"><section className="review-panel">
    <ProjectProgress activeStep={3} projectId={project.id} />
    <header className="review-header"><div><p>03 / EXTRACTION REVIEW</p><h1>추출 결과 확인</h1><span>{project.company_name} · {project.target_year}년 전기 사용량</span></div><a href={`/projects/${project.id}/upload`} className="back-link">고지서 추가하기</a></header>
    <section className="review-command"><div><span>확정 진행</span><b>{confirmedCount} / {rows.length}개월</b><p>각 사용량을 고지서와 비교한 뒤 확정하세요. 전체 확정은 현재 추출된 값을 모두 확정합니다.</p></div><form action={confirmAllMonthlyUsage}><input name="projectId" type="hidden" value={project.id} /><ConfirmUsageButton all /></form></section>
    <div className="review-summary"><section><span>확정 전기 사용량</span><strong>{totalKwh.toLocaleString()}<i> kWh</i></strong><p>확정 전 수치도 합계에는 포함됩니다.</p></section><section className="emission-total"><span>Scope 2 추정 배출량</span><strong>{(totalKg / 1000).toFixed(3)}<i> tCO₂e</i></strong><p>{totalKwh.toLocaleString()} kWh × {ELECTRICITY_FACTOR} kgCO₂e/kWh</p></section></div>
    <section className="review-table-section"><div className="review-table-heading"><h2>월별 사용량</h2><span>원본 고지서의 청구월과 사용량을 대조한 뒤 확정해 주세요.</span></div><div className="review-table-wrap"><table><thead><tr><th>청구월</th><th>원본 근거</th><th>전기 사용량</th><th>추정 배출량</th><th>확정</th></tr></thead><tbody>{rows.length === 0 ? <tr><td className="review-empty" colSpan={5}>먼저 전기요금 고지서를 업로드해 주세요.</td></tr> : rows.map((row) => { const evidence = evidenceByMonth.get(row.month); return <tr key={row.month}><td>{formatMonth(row.month)}</td><td>{evidence ? <div className="source-evidence"><span title={evidence.file_name}>{evidence.file_name}</span><small>추출값 {Number(evidence.parsed_kwh).toLocaleString()} kWh</small><OriginalPdfDialog fileName={evidence.file_name} sourceUrl={`/api/projects/${project.id}/uploads/${evidence.id}`} usageKwh={Number(evidence.parsed_kwh)} /></div> : <span className="manual-source">직접 입력값</span>}</td><td><form action={confirmMonthlyUsage} className="usage-form"><input name="projectId" type="hidden" value={project.id} /><input name="month" type="hidden" value={row.month} /><input aria-label={`${formatMonth(row.month)} 전기 사용량`} defaultValue={row.kwh} min="0" name="kwh" step="0.01" type="number" /><span>kWh</span><ConfirmUsageButton confirmed={row.confirmed} /></form></td><td>{(Number(row.kwh) * ELECTRICITY_FACTOR).toFixed(1)} kgCO₂e</td><td><span className={`review-status ${row.confirmed ? "is-confirmed" : ""}`}>{row.confirmed ? "확정됨" : "확인 필요"}</span></td></tr>; })}</tbody></table></div></section>
    <footer className="review-next">{canCreateReport ? <><span>모든 사용량을 확정했습니다. 최종 계산 결과를 확인할 수 있습니다.</span><a href={`/projects/${project.id}/report`}>결과 리포트 보기</a></> : <><span>전체 사용량을 확정하거나, 월별로 값을 확정해 주세요.</span><button disabled type="button">결과 리포트 보기</button></>}</footer>
  </section></main>;
}
