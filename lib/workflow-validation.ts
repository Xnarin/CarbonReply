import { analyzeMonthlyUsage, type MonthlyUsage, type UsageValidation } from "@/lib/bill-validation";

export type FinalizationReadiness = {
  canFinalize: boolean;
  validation: UsageValidation;
  unconfirmedMonths: string[];
};

/** Shared finalization policy for review and report screens. */
export function getFinalizationReadiness(rows: MonthlyUsage[], targetYear: number): FinalizationReadiness {
  const validation = analyzeMonthlyUsage(rows, targetYear);
  const unconfirmedMonths = rows.filter((row) => !row.confirmed).map((row) => row.month);
  return {
    canFinalize: rows.length > 0 && unconfirmedMonths.length === 0 && validation.invalidMonths.length === 0,
    validation,
    unconfirmedMonths,
  };
}
