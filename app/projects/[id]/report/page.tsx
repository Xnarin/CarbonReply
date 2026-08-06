import { redirect, notFound } from "next/navigation";
import { ProjectProgress } from "@/components/project-progress";
import { requireCurrentCompany } from "@/lib/current-company";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { completeProjectAndReturn } from "@/app/actions/review";
import { ELECTRICITY_FACTOR_SOURCE_URL, calculateElectricityEmissionsKg, getElectricityFactor } from "@/lib/emission-factor";
import { analyzeMonthlyUsage, formatMonthNumbers } from "@/lib/bill-validation";

export const dynamic = "force-dynamic";
type ReportPageProps = { params: Promise<{ id: string }> };
type ActivityRow = { month: string; kwh: number; confirmed: boolean };

function formatMonth(month: string) { return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "short" }).format(new Date(`${month}T00:00:00`)); }

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const company = await requireCurrentCompany();
  const supabase = createSupabaseAdminClient();
  const [{ data: project }, { data: activities }] = await Promise.all([
    supabase.from("projects").select("id, company_name, target_year, status").eq("id", id).eq("company_id", company.id).maybeSingle(),
    supabase.from("monthly_activity").select("month, kwh, confirmed").eq("project_id", id).order("month"),
  ]);
  if (!project) notFound();
  const rows = (activities ?? []) as ActivityRow[];
  if (rows.length === 0 || rows.some((row) => !row.confirmed)) redirect(`/projects/${id}/review`);
  const electricityFactor = getElectricityFactor(project.target_year);
  const totalKwh = rows.reduce((sum, row) => sum + Number(row.kwh), 0);
  const totalKg = calculateElectricityEmissionsKg(totalKwh, project.target_year);
  const validation = analyzeMonthlyUsage(rows, project.target_year);

  return <main className="report-page"><section className="report-panel report-board">
    <ProjectProgress activeStep={4} projectId={project.id} />
    <header className="report-header"><p>04 / EMISSIONS REPORT</p><h1>{project.target_year}년 전력 사용 결과</h1><span>{project.company_name} · 확정된 {rows.length}개월 사용량 기준</span></header>
    <div className="report-layout"><section className="report-main">
      <section className="report-hero"><p>구매전력 기반 Scope 2 추정 배출량</p><strong>{(totalKg / 1000).toFixed(3)} <i>tCO₂e</i></strong><span>{totalKwh.toLocaleString()} kWh × {electricityFactor.value} {electricityFactor.unit}</span></section>
      <section className="report-breakdown"><div><span>확정 전기 사용량</span><b>{totalKwh.toLocaleString()} <i>kWh</i></b></div><div><span>환산 배출량</span><b>{totalKg.toFixed(1)} <i>kgCO₂e</i></b></div><div><span>확정 범위</span><b>{rows.length} <i>개월</i></b></div></section>
      <section className="report-months"><div className="report-section-heading"><h2>확정된 월별 사용량</h2><span>고지서 기반 1차 데이터</span></div><div className="report-month-grid">{rows.map((row) => <div key={row.month}><span>{formatMonth(row.month)}</span><b>{Number(row.kwh).toLocaleString()} <i>kWh</i></b><em /></div>)}</div></section>
    </section><aside className="report-aside">
      <section className={`report-quality-card validation-grade-${validation.grade.toLowerCase()}`}><p>DATA QUALITY</p><strong>검증 등급 {validation.grade}</strong><span>{validation.grade === "A" ? "12개월 자료가 완비되고 이상치가 없습니다." : validation.grade === "B" ? `누락 ${validation.missingMonths.length}개월 (${formatMonthNumbers(validation.missingMonths)})이 있는 부분연도 결과입니다.` : "통계적 주의값을 원본과 대조해 개별 확정한 결과입니다."}</span></section>
      <section className="report-factor-card"><p>APPLIED FACTOR</p><dl><div><dt>배출계수</dt><dd>{electricityFactor.value} {electricityFactor.unit}</dd></div><div><dt>산정 방식</dt><dd>Location-based</dd></div><div><dt>계수 연도</dt><dd>{electricityFactor.factorYear}년</dd></div><div><dt>출처</dt><dd><a href={ELECTRICITY_FACTOR_SOURCE_URL} rel="noreferrer" target="_blank">EG-TIPS 원문 ↗</a></dd></div></dl><code>tCO₂e = kWh × {electricityFactor.value} ÷ 1,000</code>{electricityFactor.isFallback ? <small className="factor-warning">{project.target_year}년 공식 계수가 없어 {electricityFactor.factorYear}년 계수를 임시 적용했습니다.</small> : null}</section>
      <section className="report-note"><b>산정 근거</b><p>EG-TIPS에 공개된 연도별 전력배출계수와 전력 사용량을 적용한 Location-based 방식입니다.</p><small>전기요금 고지서 기반 Scope 2 간이 추정치이며, 법정 검증·공시용 배출량은 아닙니다.</small></section>
      {project.status === "completed" ? <a className="report-return-link" href="/">산정 설정으로</a> : <form action={completeProjectAndReturn} className="report-return"><input name="projectId" type="hidden" value={project.id} /><button type="submit">확정 결과 저장하고 산정 설정으로</button></form>}
    </aside></div>
  </section></main>;
}
