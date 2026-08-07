import { notFound, redirect } from "next/navigation";
import { OriginalPdfDialog } from "@/components/original-pdf-dialog";
import { ProjectProgress } from "@/components/project-progress";
import { ConfirmationOptimisticProvider, ConfirmAllUsageForm, UsageConfirmationCells } from "@/components/usage-confirmation";
import { requireCurrentCompany } from "@/lib/current-company";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { calculateElectricityEmissionsKg, getElectricityFactor } from "@/lib/emission-factor";
import { analyzeMonthlyUsage, formatMonthNumbers } from "@/lib/bill-validation";
import { getFinalizationReadiness } from "@/lib/workflow-validation";

export const dynamic = "force-dynamic";
type ReviewPageProps = { params: Promise<{ id: string }> };
type ActivityRow = { month: string; kwh: number; confirmed: boolean; source: string };
type EvidenceDocument = { id: string; file_name: string; parsed_month: string; parsed_kwh: number };
type ActivityRevision = {
  id: string;
  month: string;
  previous_kwh: number;
  new_kwh: number;
  previous_confirmed: boolean;
  new_confirmed: boolean;
  change_type: "confirmed" | "corrected";
  created_at: string;
};

function formatMonth(month: string) { return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(new Date(`${month}T00:00:00`)); }
function formatRevisionTime(createdAt: string) { return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(createdAt)); }

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
  const company = await requireCurrentCompany();
  const supabase = createSupabaseAdminClient();
  const [{ data: project }, { data: activities }, { data: documents }, { data: revisions }] = await Promise.all([
    supabase.from("projects").select("id, company_name, target_year, status").eq("id", id).eq("company_id", company.id).maybeSingle(),
    supabase.from("monthly_activity").select("month, kwh, confirmed, source").eq("project_id", id).order("month"),
    supabase.from("documents").select("id, file_name, parsed_month, parsed_kwh").eq("project_id", id).eq("parse_status", "completed"),
    supabase.from("activity_revisions").select("id, month, previous_kwh, new_kwh, previous_confirmed, new_confirmed, change_type, created_at").eq("project_id", id).order("created_at", { ascending: false }).limit(30),
  ]);
  if (!project) notFound();
  if (project.status === "completed") redirect(`/projects/${id}/report`);
  const rows = (activities ?? []) as ActivityRow[];
  if (!rows.some((row) => Number(row.kwh) > 0)) redirect(`/projects/${id}/upload`);
  const revisionRows = (revisions ?? []) as ActivityRevision[];
  const evidenceByMonth = new Map(((documents ?? []) as EvidenceDocument[]).map((document) => [document.parsed_month, document]));
  const electricityFactor = getElectricityFactor(project.target_year);
  const totalKwh = rows.reduce((sum, row) => sum + Number(row.kwh), 0);
  const totalKg = calculateElectricityEmissionsKg(totalKwh, project.target_year);
  const confirmedCount = rows.filter((row) => row.confirmed).length;
  const validation = analyzeMonthlyUsage(rows, project.target_year);
  const finalization = getFinalizationReadiness(rows, project.target_year);
  const outlierMonths = new Set(validation.outlierMonths);
  const zeroUsageMonths = new Set(validation.zeroUsageMonths);
  const warningMonths = new Set([...validation.invalidMonths, ...validation.outlierMonths, ...validation.zeroUsageMonths]);
  const hasUnconfirmedWarning = rows.some((row) => warningMonths.has(row.month) && !row.confirmed);
  const canCreateReport = finalization.canFinalize;

  return <main className="review-page"><section className="review-panel">
    <ProjectProgress activeStep={3} projectId={project.id} />
    <header className="review-header"><div><p>03 / EXTRACTION REVIEW</p><h1>추출 결과 확인</h1><span>{project.company_name} · {project.target_year}년 전기 사용량</span></div><a href={`/projects/${project.id}/upload`} className="back-link">고지서 추가하기</a></header>
    <ConfirmationOptimisticProvider>
    <section className="review-command"><div><span>확정 진행</span><b>{confirmedCount} / {rows.length}개월</b><p>{hasUnconfirmedWarning ? "주의 항목은 원본과 대조해 개별 확정한 뒤 전체 확정을 사용할 수 있습니다." : "각 사용량을 고지서와 비교한 뒤 확정하세요. 전체 확정은 현재 추출된 값을 모두 확정합니다."}</p></div><ConfirmAllUsageForm allConfirmed={canCreateReport} disabled={hasUnconfirmedWarning || rows.length === 0} projectId={project.id} /></section>
    <div className="review-summary"><section><span>확정 전기 사용량</span><strong>{totalKwh.toLocaleString()}<i> kWh</i></strong><p>확정 전 수치도 합계에는 포함됩니다.</p></section><section className="emission-total"><span>Scope 2 추정 배출량</span><strong>{(totalKg / 1000).toFixed(3)}<i> tCO₂e</i></strong><p>{totalKwh.toLocaleString()} kWh × {electricityFactor.value} {electricityFactor.unit}</p></section></div>
    <section className={`validation-board validation-grade-${validation.grade.toLowerCase()}`}>
      <div><span>DATA CHECK</span><strong>검증 등급 {validation.grade}</strong></div>
      <ul>
        <li className={rows.length > 0 ? "is-pass" : "is-warning"}>청구월·사용량 형식 {rows.length > 0 ? "정상" : "확인 필요"}</li>
        <li className={validation.missingMonths.length === 0 ? "is-pass" : "is-warning"}>{validation.missingMonths.length === 0 ? "12개월 자료 완비" : `누락 ${validation.missingMonths.length}개월 (${formatMonthNumbers(validation.missingMonths)})`}</li>
        <li className={validation.outlierMonths.length + validation.zeroUsageMonths.length === 0 ? "is-pass" : "is-warning"}>{validation.outlierMonths.length + validation.zeroUsageMonths.length === 0 ? "통계적 이상치 없음" : `주의 사용량 ${validation.outlierMonths.length + validation.zeroUsageMonths.length}건 · 개별 확인 필요`}</li>
      </ul>
    </section>
    {electricityFactor.isFallback ? <p className="factor-inline-warning">{project.target_year}년 공식 계수가 없어 최신 공개된 {electricityFactor.factorYear}년 계수를 임시 적용했습니다.</p> : null}
    <section className="review-table-section"><div className="review-table-heading"><h2>월별 사용량</h2><span>원본 고지서의 청구월과 사용량을 대조한 뒤 확정해 주세요.</span></div><div className="review-table-wrap"><table><thead><tr><th>청구월</th><th>원본 근거</th><th>전기 사용량</th><th>추정 배출량</th><th>확정</th></tr></thead><tbody>{rows.length === 0 ? <tr><td className="review-empty" colSpan={5}>먼저 전기요금 고지서를 업로드해 주세요.</td></tr> : rows.map((row) => { const evidence = evidenceByMonth.get(row.month); const isOutlier = outlierMonths.has(row.month); const isZero = zeroUsageMonths.has(row.month); const monthLabel = formatMonth(row.month); return <tr className={isOutlier || isZero ? "has-validation-warning" : ""} key={row.month}><td><div className="month-validation"><span>{monthLabel}</span>{isOutlier ? <small>평소 범위 확인</small> : isZero ? <small>0 kWh 확인</small> : null}</div></td><td>{evidence ? <div className="source-evidence"><span title={evidence.file_name}>{evidence.file_name}</span><small>추출값 {Number(evidence.parsed_kwh).toLocaleString()} kWh</small><OriginalPdfDialog fileName={evidence.file_name} sourceUrl={`/api/projects/${project.id}/uploads/${evidence.id}`} usageKwh={Number(evidence.parsed_kwh)} /></div> : <span className="manual-source">직접 입력값</span>}</td><UsageConfirmationCells confirmed={row.confirmed} emissionsKg={calculateElectricityEmissionsKg(Number(row.kwh), project.target_year)} kwh={Number(row.kwh)} month={row.month} monthLabel={monthLabel} projectId={project.id} /></tr>; })}</tbody></table></div></section>
    <section className="revision-section">
      <div className="review-table-heading"><h2>수정 이력</h2><span>사용량과 확정 상태의 실제 변경만 최근 30건까지 기록됩니다.</span></div>
      <div className="revision-list">
        {revisionRows.length === 0 ? <p className="revision-empty">아직 수정 이력이 없습니다. 기능 적용 이후 변경부터 기록됩니다.</p> : revisionRows.map((revision) => {
          const kwhChanged = Number(revision.previous_kwh) !== Number(revision.new_kwh);
          const confirmedNow = !revision.previous_confirmed && revision.new_confirmed;
          return <article key={revision.id}>
            <div><strong>{formatMonth(revision.month)}</strong><span>{kwhChanged ? (confirmedNow ? "사용량 수정 · 확정" : "사용량 수정") : "사용량 확정"}</span></div>
            <p>{kwhChanged ? <><b>{Number(revision.previous_kwh).toLocaleString()} kWh</b><i>→</i><b>{Number(revision.new_kwh).toLocaleString()} kWh</b></> : <><b>{Number(revision.new_kwh).toLocaleString()} kWh</b><i>확정</i></>}</p>
            <time dateTime={revision.created_at}>{formatRevisionTime(revision.created_at)}</time>
          </article>;
        })}
      </div>
    </section>
    <footer className="review-next">{canCreateReport ? <><span>모든 사용량을 확정했습니다. 최종 계산 결과를 확인할 수 있습니다.</span><a href={`/projects/${project.id}/report`}>결과 리포트 보기</a></> : <><span>전체 사용량을 확정하거나, 월별로 값을 확정해 주세요.</span><button disabled type="button">결과 리포트 보기</button></>}</footer>
    </ConfirmationOptimisticProvider>
  </section></main>;
}
