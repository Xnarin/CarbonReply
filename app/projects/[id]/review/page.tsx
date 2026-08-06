import { notFound } from "next/navigation";
import { confirmMonthlyUsage } from "@/app/actions/review";
import { requireCurrentCompany } from "@/lib/current-company";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ReviewPageProps = { params: Promise<{ id: string }> };
type ActivityRow = { month: string; kwh: number; confirmed: boolean; source: string };
const ELECTRICITY_FACTOR = 0.4781;

function formatMonth(month: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(new Date(`${month}T00:00:00`));
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;
  const company = await requireCurrentCompany();
  const supabase = createSupabaseAdminClient();
  const [{ data: project }, { data: activities }] = await Promise.all([
    supabase.from("projects").select("id, company_name, target_year").eq("id", id).eq("company_id", company.id).maybeSingle(),
    supabase.from("monthly_activity").select("month, kwh, confirmed, source").eq("project_id", id).order("month"),
  ]);
  if (!project) notFound();

  const rows = (activities ?? []) as ActivityRow[];
  const totalKwh = rows.reduce((sum, row) => sum + Number(row.kwh), 0);
  const totalKg = totalKwh * ELECTRICITY_FACTOR;
  const confirmedCount = rows.filter((row) => row.confirmed).length;
  return <main className="review-page"><section className="review-panel">
    <header className="review-header"><div><p>03 / EXTRACTION REVIEW</p><h1>추출 결과 확인</h1><span>{project.company_name} · {project.target_year}년 전기 사용량</span></div><a href={`/projects/${project.id}/upload`} className="back-link">고지서 추가하기</a></header>
    <div className="review-summary"><section><span>확인 완료</span><strong>{confirmedCount}<i> / {rows.length}개월</i></strong><p>AI가 읽은 사용량을 고지서와 비교해 확정해 주세요.</p></section><section><span>총 전기 사용량</span><strong>{totalKwh.toLocaleString()}<i> kWh</i></strong><p>확정 전 수치도 합계에는 포함됩니다.</p></section><section className="emission-total"><span>Scope 2 추정 배출량</span><strong>{(totalKg / 1000).toFixed(3)}<i> tCO₂e</i></strong><p>{totalKwh.toLocaleString()} kWh × {ELECTRICITY_FACTOR} kgCO₂e/kWh</p></section></div>
    <section className="calculation-proof" aria-label="산정 근거"><div><p className="proof-label">CALCULATION BASIS</p><h2>전력 사용에 따른 Scope 2 추정</h2></div><p><b>산식</b> 전기 사용량(kWh) × 전력 배출계수(0.4781 kgCO₂e/kWh)</p><p><b>출처</b> 환경부 탄소중립 생활 실천 안내서 · EG-TIPS 전력배출계수(2022.1.)</p><small>본 결과는 전기요금 고지서의 사용량을 기반으로 한 간이 추정치이며, 법정 검증 또는 공시용 배출량은 아닙니다.</small></section>
    <section className="review-table-section"><div className="review-table-heading"><h2>월별 사용량</h2><span>수정 후 ‘확정’하면 해당 월의 값이 저장됩니다.</span></div><div className="review-table-wrap"><table><thead><tr><th>청구월</th><th>추출 방식</th><th>전기 사용량</th><th>추정 배출량</th><th>상태</th></tr></thead><tbody>{rows.length === 0 ? <tr><td className="review-empty" colSpan={5}>먼저 전기요금 고지서를 업로드해 주세요.</td></tr> : rows.map((row) => <tr key={row.month}><td>{formatMonth(row.month)}</td><td>Gemini 추출</td><td><form action={confirmMonthlyUsage} className="usage-form"><input name="projectId" type="hidden" value={project.id} /><input name="month" type="hidden" value={row.month} /><input aria-label={`${formatMonth(row.month)} 전기 사용량`} defaultValue={row.kwh} min="0" name="kwh" step="0.01" type="number" /><span>kWh</span><button type="submit">{row.confirmed ? "수정" : "확정"}</button></form></td><td>{(Number(row.kwh) * ELECTRICITY_FACTOR).toFixed(1)} kgCO₂e</td><td><span className={`review-status ${row.confirmed ? "is-confirmed" : ""}`}>{row.confirmed ? "확정됨" : "확인 필요"}</span></td></tr>)}</tbody></table></div></section>
  </section></main>;
}
