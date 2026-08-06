"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createProject } from "@/app/actions/projects";
import { signOut } from "@/app/actions/auth";
import { ProjectProgress } from "@/components/project-progress";

const initialProjectState: { error?: string } = {};

function CornerMarks() {
  return <><i className="corner-mark corner-tl" /><i className="corner-mark corner-tr" /><i className="corner-mark corner-bl" /><i className="corner-mark corner-br" /></>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="blue-button blueprint-frame" disabled={pending} type="submit">{pending ? "프로젝트 생성 중…" : "프로젝트 만들기"}</button>;
}

type ExistingProject = { id: string; target_year: number; status: "draft" | "reviewing" | "completed"; created_at: string };

export function NewProjectForm({ companyName, existingProjects }: { companyName: string; existingProjects: ExistingProject[] }) {
  const [state, formAction] = useActionState(createProject, initialProjectState);
  const currentYear = new Date().getFullYear();

  return <form action={formAction} className="workbench-shell">
    <div className="workbench-frame">
      <p className="pipeline-label">SCOPE 2 · 전기요금 고지서 파이프라인</p>
      <ProjectProgress activeStep={1} onLogout={signOut} />
      <div className="workbench-body setup-body">
        <section className="workbench-main">
          <div className="section-intro"><p className="eyebrow">01 / PROJECT SETUP</p><h1>산정 설정</h1><p>산정 연도를 고르면 다음 단계에서 전기요금 고지서를 업로드할 수 있습니다.</p></div>
          <div className="project-fields">
            <label className="field-label">회사명<input defaultValue={companyName} name="companyName" readOnly /></label>
            <fieldset className="year-field"><legend className="field-label">산정 연도</legend><div className="year-options">{[currentYear - 2, currentYear - 1, currentYear].map((year) => <label key={year}><input defaultChecked={year === currentYear} name="targetYear" type="radio" value={year} /><span>{year}</span></label>)}</div></fieldset>
          </div>
          <section className="setup-guide blueprint-frame"><CornerMarks /><p className="card-kicker">CALCULATION SCOPE</p><dl className="scope-list"><div><dt>산정 범위</dt><dd>사업장 구매전력 · Scope 2</dd></div><div><dt>입력 자료</dt><dd>전기요금 고지서 PDF</dd></div><div><dt>계산 기준</dt><dd>전력 사용량 × 0.4781 kgCO₂e/kWh</dd></div></dl><p>선택한 연도의 고지서를 모아 연간 추정치를 계산합니다. 다른 에너지원은 이 MVP에 포함되지 않습니다.</p></section>
          {existingProjects.length > 0 ? <section className="existing-projects"><div><p className="card-kicker">CONTINUE A PROJECT</p><h2>진행 중인 산정</h2></div><div className="project-list">{existingProjects.map((project) => { const isReviewing = project.status !== "draft"; return <a href={`/projects/${project.id}/${isReviewing ? "review" : "upload"}`} key={project.id}><b>{project.target_year}년 전기 사용량</b><span>{isReviewing ? "사용량 검토 계속하기" : "고지서 업로드 계속하기"} →</span></a>; })}</div></section> : null}
        </section>
        <aside className="workbench-aside">
          <section className="status-card blueprint-frame"><CornerMarks /><p className="card-kicker">현재 단계</p><p className="setup-stage"><b>01</b><span>산정 설정</span></p><p className="card-copy">프로젝트를 만든 뒤에만 고지서를 업로드합니다. 아직 파일을 선택할 필요는 없습니다.</p></section>
          <section className="factor-card"><p className="card-kicker">적용 예정 계수</p><dl><div><dt>배출계수</dt><dd>0.4781 kgCO₂e/kWh</dd></div><div><dt>출처</dt><dd>환경부 안내서 · EG-TIPS</dd></div><div><dt>기준</dt><dd>전력배출계수 · 2022.1.</dd></div></dl></section>
          <div className="aside-action">{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}<SubmitButton /><p>생성 후 바로 고지서 업로드 단계로 이동합니다.</p></div>
        </aside>
      </div>
    </div>
  </form>;
}
