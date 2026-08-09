"use client";

import { useActionState, useRef } from "react";
import { registerCompany, signInCompany } from "@/app/actions/auth";

const initialAuthState: { error?: string; emailSent?: string; companyName?: string } = {};

function AuthHeader({ mode }: { mode: "login" | "signup" }) {
  return (
    <header className="access-header">
      <a className="access-brand" href="/login">
        <span>CARBONREPLY</span>
        <b>탄소길잡이</b>
      </a>
      <div className="access-steps">
        <span className={mode === "login" ? "is-current" : ""}><i>01</i> 로그인</span>
        <em />
        <span className={mode === "signup" ? "is-current" : ""}><i>02</i> 계정 발급</span>
      </div>
      <p>SCOPE 2 · ELECTRICITY DATA</p>
    </header>
  );
}

function ServiceGuide() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button className="access-guide-trigger" onClick={() => dialogRef.current?.showModal()} type="button">
        기능·테스트 안내 보기 <span aria-hidden="true">↗</span>
      </button>
      <dialog aria-labelledby="service-guide-title" className="access-guide-dialog" ref={dialogRef}>
        <section className="access-guide-modal">
          <header>
            <div><p>CARBONREPLY GUIDE</p><h2 id="service-guide-title">기능·테스트 안내</h2></div>
            <button aria-label="안내 닫기" onClick={() => dialogRef.current?.close()} type="button">×</button>
          </header>
          <div className="access-guide-content">
            <section><span>WHY</span><h3>왜 필요한가요?</h3><p>전기를 사서 사용하면서 발생하는 간접 배출량을 Scope 2라고 합니다. CarbonReply는 월별 고지서에서 전력 사용량을 모아, 배출량을 계산하기 전의 정리·검토 시간을 줄여줍니다.</p></section>
            <section><span>FLOW</span><h3>어떻게 사용하나요?</h3><ol><li><b>산정 프로젝트를 만듭니다</b><p>회사명과 산정 연도를 선택하면, 해당 연도의 고지서를 모을 작업 공간이 만들어집니다.</p></li><li><b>월별 고지서 PDF를 업로드합니다</b><p>시스템이 청구월과 전력 사용량(kWh)을 읽습니다. 파일을 잘못 올렸다면 삭제하거나 교체할 수 있습니다.</p></li><li><b>추출값을 원본과 대조합니다</b><p>원본 PDF의 사용량 표시 부분을 보고 값이 맞는지 확인합니다. 맞는 값만 월별 또는 전체 확정합니다.</p></li><li><b>결과 리포트를 확인합니다</b><p>확정된 전력 사용량에 배출계수를 적용해 Scope 2 간이 추정치를 보여주고 PDF로 내려받을 수 있습니다.</p></li></ol></section>
            <section className="guide-check-section"><span>CHECK</span><h3>확정 전에 무엇을 확인하나요?</h3><ul><li><b>청구월</b><p>같은 월의 고지서가 두 번 들어가거나 다른 연도 자료가 섞이지 않았는지 확인합니다.</p></li><li><b>사용량(kWh)</b><p>추출값과 원본 고지서의 전력 사용량이 같은지 대조합니다.</p></li><li><b>경고 메시지</b><p>고지서가 아니거나 사용량이 비정상적이면 확정하지 말고, 안내에 따라 파일을 교체하거나 다시 확인합니다.</p></li></ul></section>
            <section className="guide-test-section"><span>TEST</span><h3>테스트는 이 순서로 진행하세요</h3><dl><div><dt>회사명</dt><dd>아이엠</dd></div><div><dt>비밀번호</dt><dd>a123456789</dd></div></dl><a download href="/test-data/CarbonReply-test-data.zip">테스트 데이터 ZIP 다운로드 <b>↓</b></a><ol><li><b>정상 흐름</b><p>ZIP의 <em>01_정상_12개월</em> PDF 12개로 2026년 프로젝트를 만들고 결과 리포트까지 진행합니다.</p></li><li><b>예외 흐름</b><p>새 프로젝트에서 <em>02_예외_자료</em>를 올려 중복·연도 불일치·고지서 아님 경고와 다음 행동이 이해되는지 확인합니다.</p></li><li><b>피드백</b><p>처음 해야 할 일, 원본 대조의 의미, 경고 뒤 다음 행동이 명확했는지 알려주세요.</p></li></ol></section>
            <small>이 서비스는 전기요금 고지서 기반 Scope 2 간이 추정 도구입니다. 자동 추출값은 반드시 원본과 대조해야 하며, 법정 검증·공시용 배출량을 대신하지 않습니다.</small>
          </div>
        </section>
      </dialog>
    </>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [loginState, loginAction, loginPending] = useActionState(signInCompany, initialAuthState);
  const [signupState, signupAction, signupPending] = useActionState(registerCompany, initialAuthState);
  const state = mode === "login" ? loginState : signupState;
  const action = mode === "login" ? loginAction : signupAction;
  const pending = mode === "login" ? loginPending : signupPending;

  if (signupState.emailSent) {
    return <main className="access-page"><section className="access-workbench"><AuthHeader mode="signup" /><div className="access-issued"><div className="issued-marker">EMAIL SENT / 01</div><p className="eyebrow">PASSWORD SETUP</p><h1>비밀번호 설정 메일을<br />보냈습니다.</h1><p><b>{signupState.companyName}</b> 계정의 담당자 이메일로<br />비밀번호 설정 링크를 전송했습니다.</p><div className="credential-box"><span>DELIVERY ADDRESS</span><strong className="email-address">{signupState.emailSent}</strong><p>메일의 링크에서 회사 전용 비밀번호를 설정한 뒤 로그인해 주세요.</p></div><div className="issued-footer"><span>메일이 보이지 않으면 스팸함도 확인해 주세요.</span><a href="/login">로그인으로 계속 →</a></div></div></section></main>;
  }

  const title = mode === "login" ? <>회사 데이터에<br />접속합니다.</> : <>회사 전용<br />접속 정보를 만듭니다.</>;

  return (
    <main className="access-page">
      <section className="access-workbench">
        <AuthHeader mode={mode} />
        <div className="access-grid">
          <aside className="access-intro">
            <p className="eyebrow">{mode === "login" ? "RETURNING COMPANY" : "NEW COMPANY ACCESS"}</p>
            <h1>{title}</h1>
            <p>{mode === "login" ? "발급받은 회사명과 비밀번호를 입력하면, 이전에 생성한 프로젝트와 고지서를 이어서 관리할 수 있습니다." : "회사명과 담당자 이메일을 등록하면, 이메일로 비밀번호 설정 링크를 보내드립니다."}</p>
            <div className="access-note"><span>01</span><p>{mode === "login" ? "회사별 프로젝트와 고지서는 서로 분리되어 안전하게 관리됩니다." : "비밀번호는 이메일의 안전한 링크에서 직접 설정합니다. 이메일 본문에 비밀번호를 보내지 않습니다."}</p></div>
          </aside>
          <section className="access-form-panel">
            <div className="form-panel-heading"><span>{mode === "login" ? "SIGN IN" : "ACCOUNT ISSUE"}</span><p>{mode === "login" ? "계정 정보를 입력해 주세요." : "담당자 이메일로 비밀번호 설정 링크를 보냅니다."}</p></div>
            {mode === "login" ? <ServiceGuide /> : null}
            <form action={action} className="access-fields">
              <label><span>회사명</span><input autoComplete="organization" name="companyName" placeholder="예: 대성정밀 주식회사" required /></label>
              {mode === "signup" ? <label><span>담당자 이메일</span><input autoComplete="email" name="email" placeholder="name@company.com" required type="email" /></label> : <label><span>접속 비밀번호</span><input autoComplete="current-password" name="password" placeholder="설정한 비밀번호" required type="password" /></label>}
              {state.error ? <p className="access-error" role="alert">{state.error}</p> : null}
              <button className="access-submit" disabled={pending} type="submit"><span>{pending ? "처리 중" : mode === "login" ? "로그인하기" : "설정 링크 보내기"}</span><i>→</i></button>
            </form>
            <div className="access-switch"><span>{mode === "login" ? "처음 방문하셨나요?" : "이미 발급받은 계정이 있나요?"}</span><a href={mode === "login" ? "/signup" : "/login"}>{mode === "login" ? "회사 계정 발급" : "로그인"}</a></div>
          </section>
        </div>
      </section>
    </main>
  );
}
