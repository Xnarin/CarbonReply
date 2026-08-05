"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createProject, initialProjectState } from "@/app/actions/projects";

const months = Array.from({ length: 12 }, (_, index) => index + 1);

function CornerMarks() {
  return (
    <>
      <i className="corner-mark corner-tl" />
      <i className="corner-mark corner-tr" />
      <i className="corner-mark corner-bl" />
      <i className="corner-mark corner-br" />
    </>
  );
}

function Step({ active, complete, number, title }: { active?: boolean; complete?: boolean; number: number; title: string }) {
  return (
    <div className={`step ${active ? "step-active" : ""}`}>
      <span className={`step-number ${complete ? "step-complete" : ""}`}>{complete ? "✓" : number}</span>
      {title}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="blue-button blueprint-frame" disabled={pending} type="submit">
      {pending ? "프로젝트 생성 중…" : "업로드 준비하기"}
    </button>
  );
}

export function NewProjectForm() {
  const [state, formAction] = useActionState(createProject, initialProjectState);
  const currentYear = new Date().getFullYear();

  return (
    <form action={formAction} className="workbench-shell">
      <div className="workbench-frame">
      <p className="pipeline-label">SCOPE 2 · 전기요금 고지서 파이프라인</p>
      <nav className="workbench-nav">
        <div className="brand">
          <span className="brand-kicker">CARBONREPLY</span>
          <span>탄소길잡이</span>
        </div>
        <div className="steps" aria-label="진행 단계">
          <Step active number={1} title="업로드" />
          <span className="step-line" />
          <Step number={2} title="추출 확인" />
          <span className="step-line" />
          <Step number={3} title="리포트" />
        </div>
        <span className="account-label">협력사 탄소데이터 응답</span>
      </nav>

      <div className="workbench-body">
        <section className="workbench-main">
          <div className="section-intro">
            <p className="eyebrow">01 / PROJECT SETUP</p>
            <h1>새 산정 프로젝트</h1>
            <p>회사와 산정 연도를 입력한 뒤 전기요금 고지서를 올려 주세요.</p>
          </div>

          <div className="project-fields">
            <label className="field-label">
              회사명
              <input defaultValue="" name="companyName" placeholder="예: 대성정밀 주식회사" required />
            </label>
            <fieldset className="year-field">
              <legend className="field-label">산정 연도</legend>
              <div className="year-options">
                {[currentYear - 2, currentYear - 1, currentYear].map((year) => (
                  <label key={year}>
                    <input defaultChecked={year === currentYear} name="targetYear" type="radio" value={year} />
                    <span>{year}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <section className="upload-zone blueprint-frame" aria-label="고지서 업로드 안내">
            <CornerMarks />
            <svg aria-hidden="true" fill="none" height="32" viewBox="0 0 24 24" width="32">
              <path d="M12 3v13m-5-8 5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            </svg>
            <strong>프로젝트를 만들면 전기요금 고지서를 올릴 수 있습니다</strong>
            <span>여러 장 한 번에 · PDF · 장당 20MB 이하 · 12개월치 권장</span>
            <span className="secondary-button">파일 선택</span>
          </section>

          <section className="file-section">
            <div className="file-section-heading">
              <h2>업로드된 파일 <b>0</b></h2>
              <span>프로젝트 생성 후 파일을 추가해 주세요</span>
            </div>
            <div className="file-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>파일</th>
                    <th>청구월</th>
                    <th className="align-right">사용량</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="empty-row">
                    <td colSpan={4}>아직 업로드된 고지서가 없습니다.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </section>

        <aside className="workbench-aside">
          <section className="status-card blueprint-frame">
            <CornerMarks />
            <p className="card-kicker">진행 상황</p>
            <p className="coverage"><b>0</b> <span>/ 12개월 확보</span></p>
            <div className="month-bar" aria-label="12개월 고지서 확보 현황">
              {months.map((month) => <span key={month} />)}
            </div>
            <div className="month-label"><span>1월</span><span>12월</span></div>
            <p className="card-copy">프로젝트를 만든 뒤 고지서를 올리면, 자동으로 청구월과 전력 사용량을 읽어 옵니다.</p>
          </section>

          <section className="factor-card">
            <p className="card-kicker">적용 예정 계수</p>
            <dl>
              <div><dt>배출계수</dt><dd>0.4747 kgCO₂e/kWh</dd></div>
              <div><dt>출처</dt><dd>국가 온실가스 계수</dd></div>
              <div><dt>버전 · 적용연도</dt><dd>v1.2 · 2025</dd></div>
            </dl>
          </section>

          <div className="aside-action">
            {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
            <SubmitButton />
            <p>프로젝트 생성 후 업로드 단계로 이동합니다.</p>
          </div>
        </aside>
      </div>
      </div>
    </form>
  );
}
