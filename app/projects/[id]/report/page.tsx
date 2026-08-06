import { redirect, notFound } from "next/navigation";
import { ProjectProgress } from "@/components/project-progress";
import { requireCurrentCompany } from "@/lib/current-company";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ReportPageProps = { params: Promise<{ id: string }> };
type ActivityRow = { kwh: number; confirmed: boolean };
const ELECTRICITY_FACTOR = 0.4781;

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;
  const company = await requireCurrentCompany();
  const supabase = createSupabaseAdminClient();
  const [{ data: project }, { data: activities }] = await Promise.all([
    supabase.from("projects").select("id, company_name, target_year").eq("id", id).eq("company_id", company.id).maybeSingle(),
    supabase.from("monthly_activity").select("kwh, confirmed").eq("project_id", id),
  ]);
  if (!project) notFound();
  const rows = (activities ?? []) as ActivityRow[];
  if (rows.length === 0 || rows.some((row) => !row.confirmed)) redirect(`/projects/${id}/review`);
  const totalKwh = rows.reduce((sum, row) => sum + Number(row.kwh), 0);
  const totalKg = totalKwh * ELECTRICITY_FACTOR;

  return <main className="report-page"><section className="report-panel">
    <ProjectProgress activeStep={4} projectId={project.id} />
    <header className="report-header"><p>04 / EMISSIONS REPORT</p><h1>{project.target_year}년 전력 사용 결과</h1><span>{project.company_name} · 확정된 {rows.length}개월 사용량 기준</span></header>
    <section className="report-hero"><p>구매전력 기반 Scope 2 추정 배출량</p><strong>{(totalKg / 1000).toFixed(3)} <i>tCO₂e</i></strong><span>{totalKwh.toLocaleString()} kWh × {ELECTRICITY_FACTOR} kgCO₂e/kWh</span></section>
    <section className="report-breakdown"><div><span>확정 전기 사용량</span><b>{totalKwh.toLocaleString()} <i>kWh</i></b></div><div><span>환산 배출량</span><b>{totalKg.toFixed(1)} <i>kgCO₂e</i></b></div><div><span>산정 기준</span><b>국내 전력 평균 <i>2022.1.</i></b></div></section>
    <section className="report-note"><b>산정 근거</b><p>환경부 탄소중립 생활 실천 안내서에 제시된 전력 사용량 × 전력 배출계수(0.4781 kgCO₂e/kWh) 방식을 적용했습니다.</p><small>본 결과는 전기요금 고지서 기반의 Scope 2 간이 추정치로, 법정 검증·공시용 배출량은 아닙니다.</small></section>
  </section></main>;
}
