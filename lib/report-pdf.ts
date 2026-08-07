import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";

export type ReportPdfData = {
  companyName: string;
  targetYear: number;
  generatedAt: Date;
  finalizedAt?: Date;
  reportVersion?: number;
  totalKwh: number;
  totalKg: number;
  grade: "A" | "B" | "C";
  gradeDescription: string;
  factor: {
    factorYear: number;
    isFallback: boolean;
    unit: string;
    value: number;
    version: string;
  };
  rows: Array<{ month: string; kwh: number }>;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const INK = rgb(0.08, 0.13, 0.18);
const BLUE = rgb(0.25, 0.38, 0.5);
const PALE_BLUE = rgb(0.91, 0.94, 0.96);
const MUTED = rgb(0.36, 0.4, 0.44);
const LINE = rgb(0.8, 0.81, 0.82);
const PAPER = rgb(0.98, 0.98, 0.985);

function drawText(page: PDFPage, font: PDFFont, text: string, x: number, y: number, size: number, color = INK) {
  page.drawText(text, { x, y, size, font, color });
}

function drawRule(page: PDFPage, x1: number, y: number, x2: number, color = LINE, thickness = 0.7) {
  page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, color, thickness });
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${year}.${monthNumber}`;
}

function formatKwh(value: number) {
  return `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 3 }).format(value)} kWh`;
}

function gradeLabel(grade: ReportPdfData["grade"]) {
  if (grade === "A") return "완전성 양호";
  if (grade === "B") return "일부 자료 누락";
  return "주의 항목 확인";
}

export async function createReportPdf(data: ReportPdfData, fontBytes: Uint8Array) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: false });
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const margin = 42;
  const contentWidth = PAGE_WIDTH - margin * 2;

  pdf.setTitle(`CarbonReply ${data.targetYear} 전력 사용 결과`);
  pdf.setAuthor("CarbonReply");
  pdf.setSubject("전기요금 고지서 기반 Scope 2 간이 추정 결과");
  pdf.setCreator("CarbonReply");
  pdf.setCreationDate(data.generatedAt);

  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: PAPER });
  drawText(page, font, "CARBONREPLY", margin, 796, 8, BLUE);
  drawText(page, font, "탄소길잡이", margin, 778, 15);
  drawText(page, font, data.reportVersion ? `SCOPE 2 · FINAL REPORT v${data.reportVersion}` : "SCOPE 2 · PREVIEW REPORT", 365, 793, 8, BLUE);
  drawText(page, font, `${data.targetYear}년 전력 사용 결과`, margin, 737, 24);
  drawText(page, font, `${data.companyName} · ${data.reportVersion ? "확정 스냅샷" : "확정 전 미리보기"} · ${data.rows.length}개월 사용량 기준`, margin, 716, 10, MUTED);
  drawRule(page, margin, 696, PAGE_WIDTH - margin, BLUE, 1.4);

  page.drawRectangle({ x: margin, y: 573, width: contentWidth, height: 102, color: BLUE });
  drawText(page, font, "구매전력 기반 SCOPE 2 추정 배출량", margin + 20, 648, 10, rgb(0.92, 0.95, 0.98));
  drawText(page, font, `${(data.totalKg / 1000).toFixed(3)}`, margin + 20, 605, 34, rgb(1, 1, 1));
  drawText(page, font, "tCO₂e", margin + 145, 611, 15, rgb(1, 1, 1));
  drawText(page, font, `${formatKwh(data.totalKwh)} × ${data.factor.value} ${data.factor.unit}`, margin + 286, 623, 10, rgb(1, 1, 1));
  drawText(page, font, `검증 등급 ${data.grade} · ${gradeLabel(data.grade)}`, margin + 286, 600, 11, rgb(1, 1, 1));

  const cardWidth = (contentWidth - 16) / 3;
  const cardItems = [
    ["확정 전기 사용량", formatKwh(data.totalKwh)],
    ["환산 배출량", `${data.totalKg.toLocaleString("ko-KR", { maximumFractionDigits: 1 })} kgCO₂e`],
    ["적용 배출계수", `${data.factor.value} ${data.factor.unit}`],
  ];
  cardItems.forEach(([label, value], index) => {
    const x = margin + index * (cardWidth + 8);
    page.drawRectangle({ x, y: 505, width: cardWidth, height: 54, borderColor: LINE, borderWidth: 0.7, color: rgb(1, 1, 1) });
    drawText(page, font, label, x + 11, 540, 8, BLUE);
    drawText(page, font, value, x + 11, 518, 12);
  });

  drawText(page, font, "확정된 월별 사용량", margin, 477, 13);
  drawText(page, font, "고지서 기반 1차 데이터", PAGE_WIDTH - margin - 112, 478, 8, MUTED);
  const columnGap = 16;
  const columnWidth = (contentWidth - columnGap) / 2;
  data.rows.slice(0, 12).forEach((row, index) => {
    const column = index >= 6 ? 1 : 0;
    const rowIndex = index % 6;
    const x = margin + column * (columnWidth + columnGap);
    const y = 450 - rowIndex * 28;
    drawRule(page, x, y - 8, x + columnWidth);
    drawText(page, font, formatMonth(row.month), x + 2, y, 9, MUTED);
    const value = formatKwh(row.kwh);
    drawText(page, font, value, x + columnWidth - font.widthOfTextAtSize(value, 8.5) - 2, y, 8.5);
  });

  page.drawRectangle({ x: margin, y: 176, width: contentWidth, height: 91, color: PALE_BLUE });
  drawText(page, font, "산정 근거", margin + 15, 246, 11, BLUE);
  drawText(page, font, "계산식", margin + 15, 223, 8, MUTED);
  drawText(page, font, `tCO₂e = 전력 사용량(kWh) × ${data.factor.value} kgCO₂e/kWh ÷ 1,000`, margin + 65, 223, 9);
  drawText(page, font, "계수", margin + 15, 203, 8, MUTED);
  drawText(page, font, `${data.factor.version.replace("EG-TIPS", "EG·TIPS")} · Location-based`, margin + 65, 203, 9);
  drawText(page, font, "검증", margin + 15, 183, 8, MUTED);
  drawText(page, font, `등급 ${data.grade} · ${data.gradeDescription}`, margin + 65, 183, 9);

  drawText(page, font, "산정 범위 및 한계", margin, 145, 10, BLUE);
  drawText(page, font, "전기요금 고지서에 기재된 구매전력 사용량을 기준으로 계산한 SCOPE 2 간이 추정치입니다.", margin, 126, 8, MUTED);
  drawText(page, font, "조직경계·계약전력·재생에너지 인증서 등은 반영하지 않았으며 법정 검증·공시용 배출량이 아닙니다.", margin, 111, 8, MUTED);
  if (data.factor.isFallback) {
    drawText(page, font, `주의: ${data.targetYear}년 공식 계수가 없어 ${data.factor.factorYear}년 계수를 임시 적용했습니다.`, margin, 94, 8, rgb(0.55, 0.3, 0.1));
  }

  drawRule(page, margin, 67, PAGE_WIDTH - margin);
  const issuedAt = new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Seoul" }).format(data.finalizedAt ?? data.generatedAt).replace(/(오전|오후) (\d+):(\d+)/, "$1 $2시 $3분");
  drawText(page, font, `${data.finalizedAt ? "확정일시" : "생성일시"} ${issuedAt}`, margin, 48, 7, MUTED);
  const pageNumber = "1 / 1";
  drawText(page, font, pageNumber, PAGE_WIDTH - margin - font.widthOfTextAtSize(pageNumber, 7), 48, 7, MUTED);

  return pdf.save();
}
