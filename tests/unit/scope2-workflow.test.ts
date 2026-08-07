import { describe, expect, it } from "vitest";
import { calculateElectricityEmissionsKg, getElectricityFactor } from "@/lib/emission-factor";
import { getFinalizationReadiness } from "@/lib/workflow-validation";

const year = 2025;
const twelveMonths = Array.from({ length: 12 }, (_, index) => ({
  month: `${year}-${String(index + 1).padStart(2, "0")}-01`,
  kwh: 1_000 + index * 10,
  confirmed: true,
}));

describe("Scope 2 monthly workflow", () => {
  it("allows a confirmed, complete 12-month project to create a report", () => {
    const result = getFinalizationReadiness(twelveMonths, year);
    expect(result.canFinalize).toBe(true);
    expect(result.validation.grade).toBe("A");
    expect(result.validation.missingMonths).toEqual([]);
  });

  it("does not allow a report while one month is still unconfirmed", () => {
    const rows = twelveMonths.map((row) => row.month === "2025-06-01" ? { ...row, confirmed: false } : row);
    const result = getFinalizationReadiness(rows, year);
    expect(result.canFinalize).toBe(false);
    expect(result.unconfirmedMonths).toEqual(["2025-06-01"]);
  });

  it("does not allow a report when a bill belongs to another year", () => {
    const rows = [...twelveMonths.slice(0, 11), { month: "2024-12-01", kwh: 1_100, confirmed: true }];
    const result = getFinalizationReadiness(rows, year);
    expect(result.canFinalize).toBe(false);
    expect(result.validation.invalidMonths).toEqual(["2024-12-01"]);
  });

  it("requires manual confirmation for a suspicious value but permits the confirmed result", () => {
    const rows = twelveMonths.map((row) => row.month === "2025-08-01" ? { ...row, kwh: 9_000, confirmed: false } : row);
    const beforeConfirmation = getFinalizationReadiness(rows, year);
    const afterConfirmation = getFinalizationReadiness(rows.map((row) => ({ ...row, confirmed: true })), year);
    expect(beforeConfirmation.validation.outlierMonths).toEqual(["2025-08-01"]);
    expect(beforeConfirmation.canFinalize).toBe(false);
    expect(afterConfirmation.canFinalize).toBe(true);
  });

  it("uses the selected electricity factor in the final calculation", () => {
    expect(getElectricityFactor(year)).toMatchObject({ factorYear: 2025, value: 0.4173 });
    expect(calculateElectricityEmissionsKg(14_061, year)).toBeCloseTo(5_867.6553, 4);
  });
});
