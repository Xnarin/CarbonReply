"use client";

import { useActionState, useState } from "react";
import { initialAuthState, registerCompany, signInCompany } from "@/app/actions/auth";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [loginState, loginAction, loginPending] = useActionState(signInCompany, initialAuthState);
  const [signupState, signupAction, signupPending] = useActionState(registerCompany, initialAuthState);
  const [copied, setCopied] = useState(false);
  const state = mode === "login" ? loginState : signupState;
  const action = mode === "login" ? loginAction : signupAction;
  const pending = mode === "login" ? loginPending : signupPending;

  if (signupState.issuedPassword) {
    return <section className="auth-card"><p className="auth-kicker">PASSWORD ISSUED</p><h1>비밀번호를 보관해 주세요</h1><p className="auth-copy"><b>{signupState.companyName}</b> 전용 비밀번호입니다. 이 화면을 닫으면 다시 볼 수 없습니다.</p><div className="issued-password">{signupState.issuedPassword}</div><button className="auth-submit" type="button" onClick={() => { navigator.clipboard.writeText(signupState.issuedPassword!); setCopied(true); }}>{copied ? "복사했습니다" : "비밀번호 복사"}</button><a className="auth-link" href="/login">로그인으로 이동</a></section>;
  }

  return <section className="auth-card"><p className="auth-kicker">CARBONREPLY ACCESS</p><h1>{mode === "login" ? "회사 로그인" : "회사 계정 발급"}</h1><p className="auth-copy">{mode === "login" ? "발급받은 회사명과 비밀번호를 입력해 주세요." : "회사명을 입력하면 전용 비밀번호를 한 번 발급합니다."}</p><form action={action} className="auth-fields"><label>회사명<input autoComplete="organization" name="companyName" placeholder="예: 대성정밀 주식회사" required /></label>{mode === "login" ? <label>비밀번호<input autoComplete="current-password" name="password" type="password" required /></label> : null}{state.error ? <p className="auth-error" role="alert">{state.error}</p> : null}<button className="auth-submit" disabled={pending} type="submit">{pending ? "처리 중…" : mode === "login" ? "로그인" : "비밀번호 발급"}</button></form><a className="auth-link" href={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "처음이신가요? 회사 계정 발급" : "이미 계정이 있나요? 로그인"}</a></section>;
}
