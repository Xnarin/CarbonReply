import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ProjectProgress } from "@/components/project-progress";
import { requireCurrentCompany } from "@/lib/current-company";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { completeProjectAndReturn } from "@/app/actions/review";
import { ELECTRICITY_FACTOR_SOURCE_URL, getElectricityFactor, type ElectricityFactor } from "@/lib/emission-factor";
import { analyzeMonthlyUsage, formatMonthNumbers } from "@/lib/bill-validation";

export const dynamic = "force-dynamic";
type ReportPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ finalizeError?: string }>;
};
type ActivityRow = { month: string; kwh: number; confirmed: boolean };
type SnapshotRow = { month: string; kwh: number; emissions_kg: number };
type SavedReport = {
  id: string;
  total_kwh: number;
  total_tco2e: number;
  grade: "A" | "B" | "C";
  factor_value: number;
  factor_year: number;
  factor_version: string;
  validation_notes: string;
  version: number;
  calculated_at: string;
};

function formatMonth(month: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short" }).format(new Date(`${month}T00:00:00`));
}

function formatFinalizedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));
}

export default async function ReportPage({ params, searchParams }: ReportPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const company = await requireCurrentCompany();
  const supabase = createSupabaseAdminClient();
  const [{ data: project }, { data: activities }, { data: savedReport }, { data: snapshots }] = await Promise.all([
    supabase.from("projects").select("id, company_name, target_year, status").eq("id", id).eq("company_id", company.id).maybeSingle(),
    supabase.from("monthly_activity").select("month, kwh, confirmed").eq("project_id", id).order("month"),
    supabase.from("reports").select("id, total_kwh, total_tco2e, grade, factor_value, factor_year, factor_version, validation_notes, version, calculated_at").eq("project_id", id).maybeSingle(),
    supabase.from("report_activity_snapshots").select("month, kwh, emissions_kg").eq("project_id", id).order("month"),
  ]);
  if (!project) notFound();

  const liveRows = (activities ?? []) as ActivityRow[];
  const isFinalized = project.status === "completed";
  if (!isFinalized && (liveRows.length === 0 || liveRows.some((row) => !row.confirmed))) redirect(`/projects/${id}/review`);
  const report = savedReport as SavedReport | null;
  const snapshotRows = (snapshots ?? []) as SnapshotRow[];
  if (isFinalized && (!report || snapshotRows.length === 0)) notFound();

  const rows = isFinalized ? snapshotRows : liveRows;
  const liveValidation = analyzeMonthlyUsage(liveRows, project.target_year);
  const liveFactor = getElectricityFactor(project.target_year);
  const electricityFactor: ElectricityFactor = isFinalized && report ? {
    factorYear: Number(report.factor_year),
    isFallback: Number(report.factor_year) !== project.target_year,
    sourceLabel: "EG-TIPS 연도별 전력배출계수 안내",
    targetYear: project.target_year,
    unit: "kgCO₂e/kWh",
    value: Number(report.factor_value),
    version: report.factor_version,
  } : liveFactor;
  const totalKwh = isFinalized && report ? Number(report.total_kwh) : liveRows.reduce((sum, row) => sum + Number(row.kwh), 0);
  const totalKg = isFinalized && report ? Number(report.total_tco2e) * 1000 : totalKwh * electricityFactor.value;
  const grade = isFinalized && report ? report.grade : liveValidation.grade;
  const gradeDescription = isFinalized && report && report.validation_notes
    ? report.validation_notes
    : grade === "A"
      ? "12개월 자료가 완비되고 이상치가 없습니다."
      : grade === "B"
        ? `누락 ${liveValidation.missingMonths.length}개월 (${formatMonthNumbers(liveValidation.missingMonths)})이 있는 부분연도 결과입니다.`
        : "통계적 주의값을 원본과 대조해 개별 확정한 결과입니다.";

  return <main className="report-page"><section className="report-panel report-board">
    <ProjectProgress activeStep={4} projectId={project.id} />
    <header className="report-header"><p>04 / EMISSIONS REPORT</p><h1>{project.target_year}년 전력 사용 결과</h1><span>{project.company_name} · {isFinalized ? `확정 스냅샷 v${report?.version}` : "확정 전 미리보기"} · {rows.length}개월</span></header>
    {query.finalizeError ? <p className="report-finalize-error">결과를 확정하지 못했습니다. 사용량 확정 상태를 확인한 뒤 다시 시도해 주세요.</p> : null}
    {isFinalized && report ? <section className="report-lock-banner"><div><b>확정 결과 잠금</b><span>이 화면과 PDF는 확정 당시 저장된 값으로 표시되며 이후 수정되지 않습니다.</span></div><time dateTime={report.calculated_at}>{formatFinalizedAt(report.calculated_at)} 확정</time></section> : null}
    <div className="report-layout"><section className="report-main">
      <section className="report-hero"><p>구매전력 기반 Scope 2 추정 배출량</p><strong>{(totalKg / 1000).toFixed(3)} <i>tCO₂e</i></strong><span>{totalKwh.toLocaleString()} kWh × {electricityFactor.value} {electricityFactor.unit}</span></section>
      <section className="report-breakdown"><div><span>확정 전기 사용량</span><b>{totalKwh.toLocaleString()} <i>kWh</i></b></div><div><span>환산 배출량</span><b>{totalKg.toFixed(1)} <i>kgCO₂e</i></b></div><div><span>확정 범위</span><b>{rows.length} <i>개월</i></b></div></section>
      <section className="report-months"><div className="report-section-heading"><h2>{isFinalized ? "확정 스냅샷 월별 사용량" : "확정 예정 월별 사용량"}</h2><span>고지서 기반 1차 데이터</span></div><div className="report-month-grid">{rows.map((row) => <div key={row.month}><span>{formatMonth(row.month)}</span><b>{Number(row.kwh).toLocaleString()} <i>kWh</i></b><em /></div>)}</div></section>
    </section><aside className="report-aside">
      <section className={`report-quality-card validation-grade-${grade.toLowerCase()}`}><p>DATA QUALITY</p><strong>검증 등급 {grade}</strong><span>{gradeDescription}</span></section>
      <section className="report-factor-card"><p>APPLIED FACTOR</p><dl><div><dt>배출계수</dt><dd>{electricityFactor.value} {electricityFactor.unit}</dd></div><div><dt>산정 방식</dt><dd>Location-based</dd></div><div><dt>계수 연도</dt><dd>{electricityFactor.factorYear}년</dd></div><div><dt>출처</dt><dd><a href={ELECTRICITY_FACTOR_SOURCE_URL} rel="noreferrer" target="_blank">EG-TIPS 원문 ↗</a></dd></div></dl><code>tCO₂e = kWh × {electricityFactor.value} ÷ 1,000</code>{electricityFactor.isFallback ? <small className="factor-warning">{project.target_year}년 공식 계수가 없어 {electricityFactor.factorYear}년 계수를 임시 적용했습니다.</small> : null}</section>
      <section className="report-note"><b>산정 근거</b><p>EG-TIPS에 공개된 연도별 전력배출계수와 전력 사용량을 적용한 Location-based 방식입니다.</p><small>전기요금 고지서 기반 Scope 2 간이 추정치이며, 법정 검증·공시용 배출량은 아닙니다.</small></section>
      <a className="report-pdf-link" href={`/api/projects/${project.id}/report-pdf`}>{isFinalized ? "확정 PDF 다운로드" : "미리보기 PDF 다운로드"}</a>
      {isFinalized ? <Link className="report-return-link" href="/">산정 설정으로</Link> : <form action={completeProjectAndReturn} className="report-return"><input name="projectId" type="hidden" value={project.id} /><button type="submit">확정 결과 저장하고 산정 설정으로</button></form>}
    </aside></div>
  </section></main>;
}
