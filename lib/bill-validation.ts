export const MAX_MONTHLY_USAGE_KWH = 100_000_000;

export type MonthlyUsage = {
  month: string;
  kwh: number;
  confirmed?: boolean;
};

export type UsageValidation = {
  grade: "A" | "B" | "C";
  invalidMonths: string[];
  missingMonths: string[];
  outlierMonths: string[];
  zeroUsageMonths: string[];
};

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function isValidPdfHeader(pdf: ArrayBuffer) {
  if (pdf.byteLength < 5) return false;
  return new TextDecoder("ascii").decode(pdf.slice(0, 5)) === "%PDF-";
}

export function isValidUsageKwh(kwh: number) {
  return Number.isFinite(kwh) && kwh >= 0 && kwh <= MAX_MONTHLY_USAGE_KWH;
}

export function analyzeMonthlyUsage(rows: MonthlyUsage[], targetYear: number): UsageValidation {
  const expectedMonths = Array.from({ length: 12 }, (_, index) => `${targetYear}-${String(index + 1).padStart(2, "0")}-01`);
  const actualMonths = new Set(rows.map((row) => row.month));
  const invalidMonths = rows
    .filter((row) => !row.month.startsWith(`${targetYear}-`) || !isValidUsageKwh(Number(row.kwh)))
    .map((row) => row.month);
  const zeroUsageMonths = rows.filter((row) => Number(row.kwh) === 0).map((row) => row.month);
  const positiveValues = rows.map((row) => Number(row.kwh)).filter((value) => value > 0 && Number.isFinite(value));
  const center = positiveValues.length >= 4 ? median(positiveValues) : 0;
  const outlierMonths = center > 0
    ? rows
      .filter((row) => Number(row.kwh) > 0 && (Number(row.kwh) >= center * 3 || Number(row.kwh) <= center / 3))
      .map((row) => row.month)
    : [];
  const missingMonths = expectedMonths.filter((month) => !actualMonths.has(month));
  const hasValueWarning = invalidMonths.length > 0 || outlierMonths.length > 0 || zeroUsageMonths.length > 0;
  const grade = hasValueWarning ? "C" : missingMonths.length > 0 ? "B" : "A";

  return { grade, invalidMonths, missingMonths, outlierMonths, zeroUsageMonths };
}

export function formatMonthNumbers(months: string[]) {
  return months.map((month) => `${Number(month.slice(5, 7))}월`).join(", ");
}
