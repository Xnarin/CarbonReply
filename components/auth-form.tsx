"use client";

import { useActionState } from "react";
import { initialAuthState, registerCompany, signInCompany } from "@/app/actions/auth";

function AuthHeader({ mode }: { mode: "login" | "signup" }) {
  return <header className="access-header"><a className="access-brand" href="/login"><span>CARBONREPLY</span><b>탄소길잡이</b></a><div className="access-steps"><span className={mode === "login" ? "is-current" : ""}><i>01</i> 로그인</span><em /><span className={mode === "signup" ? "is-current" : ""}><i>02</i> 계정 발급</span></div><p>SCOPE 2 · ELECTRICITY DATA</p></header>;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [loginState, loginAction, loginPending] = useActionState(signInCompany, initialAuthState);
  const [signupState, signupAction, signupPending] = useActionState(registerCompany, initialAuthState);
  const state = mode === "login" ? loginState : signupState;
  const action = mode === "login" ? loginAction : signupAction;
  const pending = mode === "login" ? loginPending : signupPending;

  if (signupState.emailSent) return <main className="access-page"><section className="access-workbench"><AuthHeader mode="signup" /><div className="access-issued"><div className="issued-marker">EMAIL SENT / 01</div><p className="eyebrow">PASSWORD SETUP</p><h1>비밀번호 설정 메일을<br />보냈습니다.</h1><p><b>{signupState.companyName}</b> 계정의 담당자 이메일로<br />비밀번호 설정 링크를 전송했습니다.</p><div className="credential-box"><span>DELIVERY ADDRESS</span><strong className="email-address">{signupState.emailSent}</strong><p>메일의 링크에서 회사 전용 비밀번호를 설정한 뒤 로그인해 주세요.</p></div><div className="issued-footer"><span>메일이 보이지 않으면 스팸함도 확인해 주세요.</span><a href="/login">로그인으로 계속 →</a></div></div></section></main>;

  const title = mode === "login" ? <>회사 데이터에<br />접속합니다.</> : <>회사 전용<br />접속 정보를 만듭니다.</>;
  return <main className="access-page"><section className="access-workbench"><AuthHeader mode={mode} /><div className="access-grid"><aside className="access-intro"><p className="eyebrow">{mode === "login" ? "RETURNING COMPANY" : "NEW COMPANY ACCESS"}</p><h1>{title}</h1><p>{mode === "login" ? "발급받은 회사명과 비밀번호를 입력하면, 이전에 생성한 프로젝트와 고지서를 이어서 관리할 수 있습니다." : "회사명과 담당자 이메일을 등록하면, 이메일로 비밀번호 설정 링크를 보내드립니다."}</p><div className="access-note"><span>01</span><p>{mode === "login" ? "회사별 프로젝트와 고지서는 서로 분리되어 안전하게 관리됩니다." : "비밀번호는 이메일의 안전한 링크에서 직접 설정합니다. 이메일 본문에 비밀번호를 보내지 않습니다."}</p></div></aside><section className="access-form-panel"><div className="form-panel-heading"><span>{mode === "login" ? "SIGN IN" : "ACCOUNT ISSUE"}</span><p>{mode === "login" ? "계정 정보를 입력해 주세요." : "담당자 이메일로 비밀번호 설정 링크를 보냅니다."}</p></div><form action={action} className="access-fields"><label><span>회사명</span><input autoComplete="organization" name="companyName" placeholder="예: 대성정밀 주식회사" required /></label>{mode === "signup" ? <label><span>담당자 이메일</span><input autoComplete="email" name="email" placeholder="name@company.com" required type="email" /></label> : <label><span>접속 비밀번호</span><input autoComplete="current-password" name="password" placeholder="설정한 비밀번호" required type="password" /></label>}{state.error ? <p className="access-error" role="alert">{state.error}</p> : null}<button className="access-submit" disabled={pending} type="submit"><span>{pending ? "처리 중" : mode === "login" ? "로그인하기" : "설정 링크 보내기"}</span><i>→</i></button></form><div className="access-switch"><span>{mode === "login" ? "처음 방문하셨나요?" : "이미 발급받은 계정이 있나요?"}</span><a href={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "회사 계정 발급" : "로그인"}</a></div></section></div></section></main>;
}
