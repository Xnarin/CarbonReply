"use client";

import { useRef, useTransition } from "react";
import { signOut } from "@/app/actions/auth";

export function LogoutConfirmation() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isPending, startTransition] = useTransition();

  function confirmLogout() {
    startTransition(async () => {
      await signOut();
    });
  }

  return <>
    <button className="logout-button" onClick={() => dialogRef.current?.showModal()} type="button">로그아웃</button>
    <dialog aria-labelledby="logout-confirm-title" className="logout-confirm-dialog" onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }} ref={dialogRef}>
      <section>
        <span>ACCOUNT</span>
        <h2 id="logout-confirm-title">로그아웃 하시겠습니까?</h2>
        <p>현재 작업 중인 내용은 저장되어 있습니다. 다시 이용하려면 회사명과 비밀번호로 로그인해 주세요.</p>
        <div>
          <button disabled={isPending} onClick={() => dialogRef.current?.close()} type="button">아니오</button>
          <button disabled={isPending} onClick={confirmLogout} type="button">{isPending ? "로그아웃 중" : "예, 로그아웃"}</button>
        </div>
      </section>
    </dialog>
  </>;
}
