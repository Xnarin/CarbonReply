import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentCompany } from "@/lib/current-company";
import { analyzeMonthlyUsage, formatMonthNumbers } from "@/lib/bill-validation";
import { getElectricityFactor, type ElectricityFactor } from "@/lib/emission-factor";
import { createReportPdf } from "@/lib/report-pdf";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = { params: Promise<{ id: string }> };
type ActivityRow = { month: string; kwh: number; confirmed: boolean };
type SnapshotRow = { month: string; kwh: number };
type SavedReport = {
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

function describeGrade(rows: ActivityRow[], targetYear: number) {
  const validation = analyzeMonthlyUsage(rows, targetYear);
  if (validation.grade === "A") return { grade: validation.grade, description: "12개월 자료 완비 · 통계적 주의값 없음" };
  if (validation.grade === "B") return { grade: validation.grade, description: `누락 ${validation.missingMonths.length}개월 (${formatMonthNumbers(validation.missingMonths)})` };
  return { grade: validation.grade, description: `주의 사용량 ${validation.outlierMonths.length + validation.zeroUsageMonths.length}건 확인` };
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { id } = await params;
  const company = await getCurrentCompany();
  if (!company) return new Response("로그인이 필요합니다.", { status: 401 });

  const supabase = createSupabaseAdminClient();
  const [{ data: project }, { data: activities }, { data: savedReport }, { data: snapshots }] = await Promise.all([
    supabase.from("projects").select("id, company_name, target_year, status").eq("id", id).eq("company_id", company.id).maybeSingle(),
    supabase.from("monthly_activity").select("month, kwh, confirmed").eq("project_id", id).order("month"),
    supabase.from("reports").select("total_kwh, total_tco2e, grade, factor_value, factor_year, factor_version, validation_notes, version, calculated_at").eq("project_id", id).maybeSingle(),
    supabase.from("report_activity_snapshots").select("month, kwh").eq("project_id", id).order("month"),
  ]);

  if (!project) return new Response("산정 프로젝트를 찾을 수 없습니다.", { status: 404 });
  const rows = (activities ?? []) as ActivityRow[];
  const isFinalized = project.status === "completed";
  if (!isFinalized && (rows.length === 0 || rows.some((row) => !row.confirmed))) {
    return new Response("모든 월별 사용량을 확정한 뒤 PDF를 생성할 수 있습니다.", { status: 409 });
  }

  const report = savedReport as SavedReport | null;
  const snapshotRows = (snapshots ?? []) as SnapshotRow[];
  if (isFinalized && (!report || snapshotRows.length === 0)) {
    return new Response("확정 스냅샷을 찾을 수 없습니다.", { status: 409 });
  }

  const reportRows = isFinalized ? snapshotRows : rows;
  const totalKwh = isFinalized && report ? Number(report.total_kwh) : rows.reduce((sum, row) => sum + Number(row.kwh), 0);
  const factor: ElectricityFactor = isFinalized && report ? {
    factorYear: Number(report.factor_year),
    isFallback: Number(report.factor_year) !== project.target_year,
    sourceLabel: "EG-TIPS 연도별 전력배출계수 안내",
    targetYear: project.target_year,
    unit: "kgCO₂e/kWh",
    value: Number(report.factor_value),
    version: report.factor_version,
  } : getElectricityFactor(project.target_year);
  const totalKg = isFinalized && report ? Number(report.total_tco2e) * 1000 : totalKwh * factor.value;
  const liveQuality = describeGrade(rows, project.target_year);
  const quality = isFinalized && report
    ? { grade: report.grade, description: report.validation_notes || liveQuality.description }
    : liveQuality;
  const generatedAt = isFinalized && report ? new Date(report.calculated_at) : new Date();
  const fontBytes = await readFile(path.join(process.cwd(), "app", "fonts", "PretendardPDF.ttf"));
  const pdfBytes = await createReportPdf({
    companyName: project.company_name,
    targetYear: project.target_year,
    generatedAt,
    finalizedAt: isFinalized && report ? generatedAt : undefined,
    reportVersion: isFinalized && report ? report.version : undefined,
    totalKwh,
    totalKg,
    grade: quality.grade,
    gradeDescription: quality.description,
    factor,
    rows: reportRows.map((row) => ({ month: row.month, kwh: Number(row.kwh) })),
  }, fontBytes);

  const filename = `CarbonReply-${project.target_year}-Scope2-report${isFinalized && report ? `-v${report.version}` : "-preview"}.pdf`;
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
