"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createProject } from "@/app/actions/projects";
import { signOut } from "@/app/actions/auth";
import { ProjectProgress } from "@/components/project-progress";
import { ELECTRICITY_FACTOR_SOURCE_URL, getElectricityFactor } from "@/lib/emission-factor";

const initialProjectState: { error?: string } = {};

function CornerMarks() {
  return <><i className="corner-mark corner-tl" /><i className="corner-mark corner-tr" /><i className="corner-mark corner-bl" /><i className="corner-mark corner-br" /></>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="blue-button blueprint-frame" disabled={pending} type="submit">{pending ? "프로젝트 생성 중…" : "프로젝트 만들기"}</button>;
}

type ExistingProject = { id: string; target_year: number; status: "draft" | "reviewing" | "completed"; created_at: string; summary?: { totalKwh: number; totalTco2e: number } };

export function NewProjectForm({ companyName, existingProjects }: { companyName: string; existingProjects: ExistingProject[] }) {
  const [state, formAction] = useActionState(createProject, initialProjectState);
  const [recordTab, setRecordTab] = useState<"active" | "completed">("active");
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const selectedFactor = getElectricityFactor(selectedYear);
  const visibleProjects = existingProjects.filter((project) => recordTab === "completed" ? project.status === "completed" : project.status !== "completed");
  const activeCount = existingProjects.filter((project) => project.status !== "completed").length;
  const completedCount = existingProjects.length - activeCount;

  return <form action={formAction} className="workbench-shell">
    <div className="workbench-frame">
      <p className="pipeline-label">SCOPE 2 · 전기요금 고지서 파이프라인</p>
      <ProjectProgress activeStep={1} onLogout={signOut} />
      <div className="workbench-body setup-body">
        <section className="workbench-main">
          <div className="section-intro"><p className="eyebrow">01 / PROJECT SETUP</p><h1>산정 설정</h1><p>산정 연도를 고르면 다음 단계에서 전기요금 고지서를 업로드할 수 있습니다.</p></div>
          <div className="project-fields">
            <label className="field-label">회사명<input defaultValue={companyName} name="companyName" readOnly /></label>
            <fieldset className="year-field"><legend className="field-label">산정 연도</legend><div className="year-options">{[currentYear - 2, currentYear - 1, currentYear].map((year) => <label key={year}><input checked={year === selectedYear} name="targetYear" onChange={() => setSelectedYear(year)} type="radio" value={year} /><span>{year}</span></label>)}</div></fieldset>
          </div>
          <section className="setup-guide blueprint-frame"><CornerMarks /><p className="card-kicker">CALCULATION SCOPE</p><dl className="scope-list"><div><dt>산정 범위</dt><dd>사업장 구매전력 · Scope 2</dd></div><div><dt>입력 자료</dt><dd>전기요금 고지서 PDF</dd></div><div><dt>계산 기준</dt><dd>전력 사용량 × {selectedFactor.value} {selectedFactor.unit}</dd></div></dl><p>선택한 연도의 고지서를 모아 연간 추정치를 계산합니다. 다른 에너지원은 이 MVP에 포함되지 않습니다.</p></section>
          {existingProjects.length > 0 ? <section className="existing-projects"><div className="project-record-heading"><div><p className="card-kicker">PROJECT RECORDS</p><h2>{recordTab === "active" ? "진행 중인 산정" : "확정된 결과"}</h2></div><div className="record-tabs" role="tablist"><button aria-selected={recordTab === "active"} className={recordTab === "active" ? "is-active" : ""} onClick={() => setRecordTab("active")} role="tab" type="button">진행 중 <b>{activeCount}</b></button><button aria-selected={recordTab === "completed"} className={recordTab === "completed" ? "is-active" : ""} onClick={() => setRecordTab("completed")} role="tab" type="button">확정 결과 <b>{completedCount}</b></button></div></div><div className="project-list">{visibleProjects.length === 0 ? <p className="record-empty">{recordTab === "active" ? "진행 중인 산정이 없습니다." : "아직 확정된 결과가 없습니다."}</p> : visibleProjects.map((project) => { const isCompleted = project.status === "completed"; const href = isCompleted ? `/projects/${project.id}/report` : project.status === "reviewing" ? `/projects/${project.id}/review` : `/projects/${project.id}/upload`; return <a href={href} key={project.id}><b>{project.target_year}년 전기 사용량</b>{isCompleted && project.summary ? <small>확정 {project.summary.totalKwh.toLocaleString()} kWh · {project.summary.totalTco2e.toFixed(3)} tCO₂e</small> : null}<span>{isCompleted ? "확정 결과 다시 보기" : project.status === "reviewing" ? "사용량 검토 계속하기" : "고지서 업로드 계속하기"} →</span></a>; })}</div></section> : null}
        </section>
        <aside className="workbench-aside">
          <section className="status-card blueprint-frame"><CornerMarks /><p className="card-kicker">현재 단계</p><p className="setup-stage"><b>01</b><span>산정 설정</span></p><p className="card-copy">프로젝트를 만든 뒤에만 고지서를 업로드합니다. 아직 파일을 선택할 필요는 없습니다.</p></section>
          <section className="factor-card"><p className="card-kicker">적용 예정 계수</p><dl><div><dt>배출계수</dt><dd>{selectedFactor.value} {selectedFactor.unit}</dd></div><div><dt>출처</dt><dd><a href={ELECTRICITY_FACTOR_SOURCE_URL} rel="noreferrer" target="_blank">EG-TIPS 원문 ↗</a></dd></div><div><dt>기준</dt><dd>{selectedFactor.factorYear}년 소비단 기준</dd></div></dl>{selectedFactor.isFallback ? <p className="factor-warning">{selectedYear}년 공식 계수가 없어 최신 공개된 {selectedFactor.factorYear}년 계수를 임시 적용합니다.</p> : null}</section>
          <div className="aside-action">{state.error ? <p className="form-error" role="alert">{state.error}</p> : null}<SubmitButton /><p>생성 후 바로 고지서 업로드 단계로 이동합니다.</p></div>
        </aside>
      </div>
    </div>
  </form>;
}
