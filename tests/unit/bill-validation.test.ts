import { describe, expect, it } from "vitest";
import { isValidBillUsageKwh } from "@/lib/bill-validation";

describe("electricity-bill usage validation", () => {
  it("rejects zero kWh as an extraction or confirmation value", () => {
    expect(isValidBillUsageKwh(0)).toBe(false);
  });

  it("accepts a positive billed usage value", () => {
    expect(isValidBillUsageKwh(1284.5)).toBe(true);
  });
});
