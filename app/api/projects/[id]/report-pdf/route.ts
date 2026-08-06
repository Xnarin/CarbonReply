import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentCompany } from "@/lib/current-company";
import { analyzeMonthlyUsage, formatMonthNumbers } from "@/lib/bill-validation";
import { calculateElectricityEmissionsKg, getElectricityFactor } from "@/lib/emission-factor";
import { createReportPdf } from "@/lib/report-pdf";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = { params: Promise<{ id: string }> };
type ActivityRow = { month: string; kwh: number; confirmed: boolean };

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
  const [{ data: project }, { data: activities }] = await Promise.all([
    supabase.from("projects").select("id, company_name, target_year").eq("id", id).eq("company_id", company.id).maybeSingle(),
    supabase.from("monthly_activity").select("month, kwh, confirmed").eq("project_id", id).order("month"),
  ]);

  if (!project) return new Response("산정 프로젝트를 찾을 수 없습니다.", { status: 404 });
  const rows = (activities ?? []) as ActivityRow[];
  if (rows.length === 0 || rows.some((row) => !row.confirmed)) {
    return new Response("모든 월별 사용량을 확정한 뒤 PDF를 생성할 수 있습니다.", { status: 409 });
  }

  const totalKwh = rows.reduce((sum, row) => sum + Number(row.kwh), 0);
  const totalKg = calculateElectricityEmissionsKg(totalKwh, project.target_year);
  const factor = getElectricityFactor(project.target_year);
  const quality = describeGrade(rows, project.target_year);
  const fontBytes = await readFile(path.join(process.cwd(), "app", "fonts", "PretendardPDF.ttf"));
  const pdfBytes = await createReportPdf({
    companyName: project.company_name,
    targetYear: project.target_year,
    generatedAt: new Date(),
    totalKwh,
    totalKg,
    grade: quality.grade,
    gradeDescription: quality.description,
    factor,
    rows: rows.map((row) => ({ month: row.month, kwh: Number(row.kwh) })),
  }, fontBytes);

  const filename = `CarbonReply-${project.target_year}-Scope2-report.pdf`;
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
