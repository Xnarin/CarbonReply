"use client";

import { useEffect, useRef, useState } from "react";

type Highlight = { height: number; left: number; top: number; width: number };

function normalizeNumber(value: string) {
  return value.normalize("NFKC").replace(/[^0-9]/g, "");
}

export function OriginalPdfDialog({ fileName, sourceUrl, usageKwh }: { fileName: string; sourceUrl: string; usageKwh: number }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [status, setStatus] = useState("원본에서 사용량 위치를 찾고 있습니다…");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function renderEvidence() {
      setHighlight(null);
      setStatus("원본에서 사용량 위치를 찾고 있습니다…");
      try {
        const response = await fetch(`${sourceUrl}?raw=1`, { cache: "no-store" });
        if (!response.ok) throw new Error("PDF download failed");
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
        const pdf = await pdfjs.getDocument({ data: await response.arrayBuffer() }).promise;
        const target = normalizeNumber(String(usageKwh));
        let matchedPage = 1;
        let matchedItem: { str: string; transform: number[]; width: number } | null = null;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const text = await page.getTextContent();
          const item = text.items.find((candidate) => "str" in candidate && normalizeNumber(candidate.str).includes(target));
          if (item && "str" in item) {
            matchedPage = pageNumber;
            matchedItem = { str: item.str, transform: [...item.transform], width: item.width };
            break;
          }
        }

        const page = await pdf.getPage(matchedPage);
        const viewport = page.getViewport({ scale: 1.15 });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is unavailable");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        if (cancelled) return;

        if (matchedItem) {
          const transform = pdfjs.Util.transform(viewport.transform, matchedItem.transform);
          const fontHeight = Math.hypot(transform[2], transform[3]);
          setHighlight({ left: Math.max(0, transform[4] - 5), top: Math.max(0, transform[5] - fontHeight - 4), width: Math.max(38, matchedItem.width * viewport.scale + 10), height: fontHeight + 8 });
          setStatus(`${matchedPage}페이지에서 ${matchedItem.str} 값을 자동으로 찾았습니다.`);
        } else {
          setStatus("숫자 위치를 자동으로 찾지 못했습니다. 원본 화면에서 직접 확인해 주세요.");
        }
      } catch {
        if (!cancelled) setStatus("PDF 미리보기를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    }

    void renderEvidence();
    return () => { cancelled = true; };
  }, [isOpen, sourceUrl, usageKwh]);

  return <>
    <button className="source-preview-button" onClick={() => setIsOpen(true)} type="button">원본 PDF 대조</button>
    <dialog className="source-pdf-dialog" onClose={() => setIsOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }} ref={dialogRef}>
      <section className="source-pdf-panel">
        <header><div><span>ORIGINAL BILL</span><h2>{fileName}</h2><p>고지서의 청구월과 전력 사용량 항목을 추출값과 대조해 주세요.</p></div><button aria-label="원본 PDF 닫기" onClick={() => setIsOpen(false)} type="button">닫기 ×</button></header>
        <div className="source-pdf-stage"><p className={highlight ? "is-found" : ""}>{status}</p><div className="source-pdf-canvas-wrap"><canvas ref={canvasRef} />{highlight ? <mark aria-label="추출된 전기 사용량 위치" style={highlight} /> : null}</div></div>
      </section>
    </dialog>
  </>;
}
