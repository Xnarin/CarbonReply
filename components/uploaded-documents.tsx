"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type UploadedDocument = {
  id: string;
  file_name: string;
  size_bytes: number;
  parse_status: "uploading" | "pending" | "completed" | "failed";
  created_at: string;
};

function formatSize(size: number) {
  return `${(size / 1024 / 1024).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)}MB`;
}

function statusLabel(status: UploadedDocument["parse_status"]) {
  return { uploading: "추출 대기", pending: "추출 중", completed: "추출 완료", failed: "확인 필요" }[status];
}

export function UploadedDocuments({ documents, projectId }: { documents: UploadedDocument[]; projectId: string }) {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");
  const queuedDocuments = documents.filter((document) => document.parse_status === "uploading");
  const hasCompletedDocuments = documents.some((document) => document.parse_status === "completed");

  async function deleteDocument(document: UploadedDocument) {
    if (isWorking || !window.confirm(`‘${document.file_name}’을(를) 삭제할까요?`)) return;
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
        const body = await response.json() as { error?: string; month?: string; code?: string };
        if (!response.ok) {
          if (body.code === "duplicate_month" && body.month) {
            notices.push(`${document.file_name}: ${body.month.slice(0, 7)} 청구월이 이미 있어 제외했습니다.`);
          } else {
            notices.push(`${document.file_name}: ${body.error ?? "추출하지 못했습니다."}`);
          }
        }
      } catch {
        notices.push(`${document.file_name}: 처리 중 연결 문제가 발생했습니다.`);
      }
    }

    setMessage(notices.length > 0 ? notices.join(" ") : `${queuedDocuments.length}개 고지서의 사용량을 추출했습니다.`);
    setIsWorking(false);
    router.refresh();
  }

  return <section className="uploaded-files" aria-labelledby="uploaded-files-title">
    <div className="uploaded-files-heading">
      <div><h2 id="uploaded-files-title">업로드된 고지서 <b>{documents.length}</b></h2><span>추출 전에는 삭제하거나 다른 파일로 교체할 수 있습니다.</span></div>
      {queuedDocuments.length > 0 ? <button className="extract-start-button" disabled={isWorking} onClick={startExtraction} type="button">{isWorking ? "사용량 추출 중…" : `업로드 확인 후 추출 시작 (${queuedDocuments.length})`}</button> : null}
    </div>
    {message ? <p className="upload-management-message" role="status">{message}</p> : null}
    <div className="document-table-wrap">
      <table>
        <thead><tr><th>파일</th><th>용량</th><th>상태</th><th>업로드 시각</th><th>관리</th></tr></thead>
        <tbody>
          {documents.length === 0 ? <tr><td colSpan={5} className="document-empty">아직 업로드된 고지서가 없습니다.</td></tr> : documents.map((document) => <tr key={document.id}>
            <td>{document.file_name}</td><td>{formatSize(document.size_bytes)}</td><td><span className={`status-pill status-${document.parse_status}`}>{statusLabel(document.parse_status)}</span></td>
            <td>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(document.created_at))}</td>
            <td><button className="document-delete-button" disabled={isWorking} onClick={() => deleteDocument(document)} type="button">삭제 · 교체</button></td>
          </tr>)}
        </tbody>
      </table>
    </div>
    {hasCompletedDocuments ? <p className="upload-ready-note">추출된 사용량은 다음 단계에서 직접 확인하고 확정할 수 있습니다.</p> : null}
  </section>;
}
