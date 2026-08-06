"use client";

import { useEffect, useRef, useState } from "react";

export function OriginalPdfDialog({ fileName, sourceUrl }: { fileName: string; sourceUrl: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return <>
    <button className="source-preview-button" onClick={() => setIsOpen(true)} type="button">원본 PDF 대조</button>
    <dialog className="source-pdf-dialog" onClose={() => setIsOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }} ref={dialogRef}>
      <section className="source-pdf-panel">
        <header><div><span>ORIGINAL BILL</span><h2>{fileName}</h2><p>고지서의 청구월과 전력 사용량 항목을 추출값과 대조해 주세요.</p></div><button aria-label="원본 PDF 닫기" onClick={() => setIsOpen(false)} type="button">닫기 ×</button></header>
        {isOpen ? <iframe src={sourceUrl} title={`${fileName} 원본 PDF`} /> : null}
      </section>
    </dialog>
  </>;
}
