export type ParseErrorCode = "invalid_pdf" | "year_mismatch" | "invalid_usage" | "duplicate_month" | "extraction_failed" | null;

export type ExtractionDocument = {
  parse_status: "uploading" | "pending" | "completed" | "failed";
  parse_error_code?: ParseErrorCode;
};

export type ExtractionQuality = {
  kind: "pending" | "review" | "manual";
  label: string;
  description: string;
};

export function getExtractionQuality(document: ExtractionDocument): ExtractionQuality {
  if (document.parse_status === "uploading" || document.parse_status === "pending") {
    return { kind: "pending", label: "추출 대기", description: "업로드 확인 후 사용량을 추출합니다." };
  }
  if (document.parse_status === "completed") {
    return { kind: "review", label: "원본 확인", description: "사용량과 청구월을 원본 고지서와 대조한 뒤 확정하세요." };
  }

  const messages: Record<Exclude<ParseErrorCode, null>, string> = {
    invalid_pdf: "PDF 파일 형식을 확인하지 못했습니다. 원본 파일로 교체하거나 직접 입력하세요.",
    year_mismatch: "프로젝트 산정 연도와 고지서 청구 연도가 다릅니다. 다른 프로젝트에 올리거나 직접 확인하세요.",
    invalid_usage: "사용량(kWh)이 비어 있거나 허용 범위를 벗어났습니다. 원본을 보고 직접 입력하세요.",
    duplicate_month: "같은 청구월의 고지서가 이미 있습니다. 기존 파일을 확인하거나 교체하세요.",
    extraction_failed: "청구월 또는 사용량을 읽지 못했습니다. 원본을 보고 직접 입력하세요.",
  };
  return {
    kind: "manual",
    label: "직접 보정 필요",
    description: messages[document.parse_error_code ?? "extraction_failed"],
  };
}
