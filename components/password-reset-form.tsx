"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function PasswordResetForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    if (password.length < 10) return setMessage("비밀번호는 10자 이상으로 설정해 주세요.");
    setPending(true);
    const { error } = await createSupabaseBrowserClient().auth.updateUser({ password });
    setPending(false);
    if (error) return setMessage("링크가 만료되었거나 유효하지 않습니다. 다시 계정을 발급해 주세요.");
    router.replace("/");
    router.refresh();
  }
  return <main className="access-page"><section className="access-workbench reset-workbench"><div className="access-issued"><p className="eyebrow">PASSWORD SETUP</p><h1>회사 전용 비밀번호를<br />설정해 주세요.</h1><p>영문, 숫자, 기호를 조합해 10자 이상으로 설정해 주세요.</p><form className="access-fields reset-fields" onSubmit={submit}><label><span>새 비밀번호</span><input autoComplete="new-password" name="password" required type="password" /></label>{message ? <p className="access-error">{message}</p> : null}<button className="access-submit" disabled={pending} type="submit"><span>{pending ? "저장 중" : "비밀번호 설정 완료"}</span><i>→</i></button></form></div></section></main>;
}
