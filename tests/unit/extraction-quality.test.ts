import { describe, expect, it } from "vitest";
import { getExtractionQuality } from "@/lib/extraction-quality";

describe("extraction quality center", () => {
  it("sends successful automatic extraction to source review", () => {
    expect(getExtractionQuality({ parse_status: "completed" })).toMatchObject({ kind: "review", label: "원본 확인" });
  });

  it("explains a duplicate billing month and requests manual action", () => {
    const result = getExtractionQuality({ parse_status: "failed", parse_error_code: "duplicate_month" });
    expect(result.kind).toBe("manual");
    expect(result.description).toContain("같은 청구월");
  });

  it("handles unknown extraction failure without hiding the next step", () => {
    const result = getExtractionQuality({ parse_status: "failed", parse_error_code: null });
    expect(result).toMatchObject({ kind: "manual", label: "직접 보정 필요" });
  });
});
