"use client";

import { useActionState, useState } from "react";
import { initialAuthState, registerCompany, signInCompany } from "@/app/actions/auth";

function AuthHeader({ mode }: { mode: "login" | "signup" }) {
  return <header className="access-header"><a className="access-brand" href="/login"><span>CARBONREPLY</span><b>탄소길잡이</b></a><div className="access-steps" aria-label="계정 진행 단계"><span className={mode === "login" ? "is-current" : ""}><i>01</i> 로그인</span><em /><span className={mode === "signup" ? "is-current" : ""}><i>02</i> 계정 발급</span></div><p>SCOPE 2 · ELECTRICITY DATA</p></header>;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [loginState, loginAction, loginPending] = useActionState(signInCompany, initialAuthState);
  const [signupState, signupAction, signupPending] = useActionState(registerCompany, initialAuthState);
  const [copied, setCopied] = useState(false);
  const state = mode === "login" ? loginState : signupState;
  const action = mode === "login" ? loginAction : signupAction;
  const pending = mode === "login" ? loginPending : signupPending;

  if (signupState.issuedPassword) {
    return <main className="access-page"><section className="access-workbench"><AuthHeader mode="signup" /><div className="access-issued"><div className="issued-marker">ISSUED / 01</div><p className="eyebrow">COMPANY CREDENTIAL</p><h1>전용 비밀번호가<br />발급되었습니다.</h1><p><b>{signupState.companyName}</b> 전용 접속 비밀번호입니다.<br />보안을 위해 이 화면에서만 확인할 수 있습니다.</p><div className="credential-box"><span>ACCESS PASSWORD</span><strong>{signupState.issuedPassword}</strong><button type="button" onClick={() => { void navigator.clipboard.writeText(signupState.issuedPassword!); setCopied(true); }}>{copied ? "복사 완료" : "복사하기"}</button></div><div className="issued-footer"><span>비밀번호를 안전한 곳에 보관해 주세요.</span><a href="/login">로그인으로 계속 →</a></div></div></section></main>;
  }

  const title = mode === "login" ? <>회사 데이터에<br />접속합니다.</> : <>회사 전용<br />접속 정보를 만듭니다.</>;
  return <main className="access-page"><section className="access-workbench"><AuthHeader mode={mode} /><div className="access-grid"><aside className="access-intro"><p className="eyebrow">{mode === "login" ? "RETURNING COMPANY" : "NEW COMPANY ACCESS"}</p><h1>{title}</h1><p>{mode === "login" ? "발급받은 회사명과 비밀번호를 입력하면, 이전에 생성한 프로젝트와 고지서를 이어서 관리할 수 있습니다." : "회사명을 등록하면 탄소길잡이 전용 비밀번호를 발급합니다. 발급된 비밀번호로 바로 로그인할 수 있습니다."}</p><div className="access-note"><span>01</span><p>{mode === "login" ? "회사별 프로젝트와 고지서는 서로 분리되어 안전하게 관리됩니다." : "비밀번호는 발급 직후 한 번만 표시됩니다. 반드시 복사해 보관해 주세요."}</p></div></aside><section className="access-form-panel"><div className="form-panel-heading"><span>{mode === "login" ? "SIGN IN" : "ACCOUNT ISSUE"}</span><p>{mode === "login" ? "계정 정보를 입력해 주세요." : "회사명만 입력하면 됩니다."}</p></div><form action={action} className="access-fields"><label><span>회사명</span><input autoComplete="organization" name="companyName" placeholder="예: 대성정밀 주식회사" required /></label>{mode === "login" ? <label><span>접속 비밀번호</span><input autoComplete="current-password" name="password" placeholder="발급받은 비밀번호" required type="password" /></label> : null}{state.error ? <p className="access-error" role="alert">{state.error}</p> : null}<button className="access-submit" disabled={pending} type="submit"><span>{pending ? "처리 중" : mode === "login" ? "로그인하기" : "비밀번호 발급하기"}</span><i>→</i></button></form><div className="access-switch"><span>{mode === "login" ? "처음 방문하셨나요?" : "이미 발급받은 계정이 있나요?"}</span><a href={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "회사 계정 발급" : "로그인"}</a></div></section></div></section></main>;
}
