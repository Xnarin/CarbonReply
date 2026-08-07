"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getExtractionQuality, type ParseErrorCode } from "@/lib/extraction-quality";

export type UploadedDocument = {
  id: string;
  file_name: string;
  size_bytes: number;
  parse_status: "uploading" | "pending" | "completed" | "failed";
  parse_error_code: ParseErrorCode;
  parsed_month: string | null;
  parsed_kwh: number | null;
  created_at: string;
};

function formatSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
}

function formatMonth(value: string | null) {
  return value ? value.slice(0, 7).replace("-", "년 ") + "월" : "";
}

export function UploadedDocuments({ documents, projectId }: { documents: UploadedDocument[]; projectId: string }) {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [correctionDocument, setCorrectionDocument] = useState<UploadedDocument | null>(null);
  const queuedDocuments = documents.filter((document) => document.parse_status === "uploading");
  const qualityCounts = documents.reduce((counts, document) => {
    const quality = getExtractionQuality(document);
    if (quality.nextAction === "manual_correction") counts.manual += 1;
    else if (quality.nextAction === "replace") counts.replace += 1;
    else counts[quality.kind] += 1;
    return counts;
  }, { pending: 0, review: 0, manual: 0, replace: 0 });

  async function deleteDocument(document: UploadedDocument) {
    if (isWorking || !window.confirm(`'${document.file_name}'을(를) 삭제할까요?`)) return;
    setIsWorking(true);
    setMessage("");
    try {
      const response = await fetch(`/api/projects/${projectId}/uploads/${document.id}`, { method: "DELETE" });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "파일을 삭제하지 못했습니다.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "파일 삭제 중 문제가 발생했습니다.");
    } finally {
      setIsWorking(false);
    }
  }

  async function startExtraction() {
    if (queuedDocuments.length === 0 || isWorking) return;
    setIsWorking(true);
    setMessage("");
    const notices: string[] = [];
    for (const document of queuedDocuments) {
      try {
        const response = await fetch(`/api/projects/${projectId}/uploads/${document.id}/complete`, { method: "POST" });
        const body = await response.json() as { error?: string };
        if (!response.ok) notices.push(`${document.file_name}: ${body.error ?? "추출하지 못했습니다."}`);
      } catch {
        notices.push(`${document.file_name}: 처리 중 연결 문제가 발생했습니다.`);
      }
    }
    setMessage(notices.length > 0 ? notices.join(" ") : `${queuedDocuments.length}개 고지서의 사용량을 추출했습니다.`);
    setIsWorking(false);
    router.refresh();
  }

  async function submitCorrection(formData: FormData) {
    if (!correctionDocument || isWorking) return;
    setIsWorking(true);
    setMessage("");
    try {
      const response = await fetch(`/api/projects/${projectId}/uploads/${correctionDocument.id}/manual`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: formData.get("month"), kwh: formData.get("kwh") }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "보정값을 저장하지 못했습니다.");
      setCorrectionDocument(null);
      setMessage("직접 입력한 사용량을 저장했습니다. 다음 단계에서 원본과 대조해 확정하세요.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "보정값 저장 중 문제가 발생했습니다.");
    } finally {
      setIsWorking(false);
    }
  }

  return <section className="uploaded-files" aria-labelledby="uploaded-files-title">
    <div className="uploaded-files-heading">
      <div><h2 id="uploaded-files-title">업로드된 고지서 <b>{documents.length}</b></h2><span>추출 전에는 삭제·교체할 수 있고, 실패한 파일은 원본을 보며 직접 보정할 수 있습니다.</span></div>
      {queuedDocuments.length > 0 ? <button className="extract-start-button" disabled={isWorking} onClick={startExtraction} type="button">{isWorking ? "사용량 추출 중" : `업로드 확인 및 추출 시작 (${queuedDocuments.length})`}</button> : null}
    </div>

    {documents.length > 0 ? <section className="extraction-quality-center" aria-label="추출 품질 요약">
      <div><span>자동 추출</span><b>{qualityCounts.review}</b><small>원본 대조 필요</small></div>
      <div><span>직접 보정</span><b>{qualityCounts.manual}</b><small>원본을 보고 값 입력</small></div>
      <div><span>고지서 교체</span><b>{qualityCounts.replace}</b><small>다른 파일 업로드 필요</small></div>
      <div><span>처리 대기</span><b>{qualityCounts.pending}</b><small>추출 시작 전</small></div>
    </section> : null}

    {message ? <p className="upload-management-message" role="status">{message}</p> : null}
    <div className="document-table-wrap">
      <table>
        <thead><tr><th>파일</th><th>용량</th><th>추출 상태</th><th>다음 작업</th><th>관리</th></tr></thead>
        <tbody>
          {documents.length === 0 ? <tr><td colSpan={5} className="document-empty">아직 업로드된 고지서가 없습니다.</td></tr> : documents.map((document) => {
            const quality = getExtractionQuality(document);
            return <tr key={document.id}>
              <td><b className="document-name">{document.file_name}</b><small>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(document.created_at))}</small></td>
              <td>{formatSize(document.size_bytes)}</td>
              <td><span className={`status-pill quality-${quality.kind}`}>{quality.label}</span>{document.parsed_kwh !== null ? <small className="document-value">{formatMonth(document.parsed_month)} · {Number(document.parsed_kwh).toLocaleString()} kWh</small> : null}</td>
              <td><p className="quality-description">{quality.description}</p></td>
              <td><div className="document-actions"><a href={`/api/projects/${projectId}/uploads/${document.id}?raw=1`} target="_blank" rel="noreferrer">원본 보기</a>{quality.nextAction === "manual_correction" ? <button disabled={isWorking} onClick={() => setCorrectionDocument(document)} type="button">직접 보정</button> : null}<button disabled={isWorking} onClick={() => deleteDocument(document)} type="button">{quality.nextAction === "replace" ? "삭제 후 교체" : "삭제·교체"}</button></div></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>

    {correctionDocument ? <form action={submitCorrection} className="manual-correction-panel">
      <div><p>직접 보정</p><h3>{correctionDocument.file_name}</h3><span>원본 고지서를 보고 청구월과 전기 사용량을 입력하세요. 저장 후 검토 화면에서 최종 확정합니다.</span></div>
      <label>청구월<input defaultValue={correctionDocument.parsed_month?.slice(0, 7) ?? ""} name="month" required type="month" /></label>
      <label>전기 사용량(kWh)<input defaultValue={correctionDocument.parsed_kwh ?? ""} min="0.01" name="kwh" required step="0.01" type="number" /></label>
      <div><button disabled={isWorking} type="submit">{isWorking ? "저장 중" : "보정값 저장"}</button><button disabled={isWorking} onClick={() => setCorrectionDocument(null)} type="button">취소</button></div>
    </form> : null}
  </section>;
}
