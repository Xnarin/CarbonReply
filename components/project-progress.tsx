import { signOut } from "@/app/actions/auth";

const steps = ["산정 설정", "고지서 업로드", "사용량 검토"];

export function ProjectProgress({ activeStep, projectId: _projectId, onLogout }: { activeStep: 1 | 2 | 3; projectId?: string; onLogout?: typeof signOut }) {
  return <nav className="project-progress" aria-label="산정 진행 단계">
    <a className="brand" href="/"><span className="brand-kicker">CARBONREPLY</span><span>탄소길잡이</span></a>
    <div className="steps">{steps.map((title, index) => { const number = index + 1; const completed = number < activeStep; return <div className="progress-step-wrap" key={title}>{index > 0 ? <span className="step-line" /> : null}<div className={`step ${number === activeStep ? "step-active" : ""}`}><span className={`step-number ${completed ? "step-complete" : ""}`}>{completed ? "✓" : number}</span>{title}</div></div>; })}</div>
    <div className="account-area"><span className="account-label">협력사 탄소데이터 응답</span>{onLogout ? <button className="logout-button" formAction={onLogout} type="submit">로그아웃</button> : <form action={signOut}><button className="logout-button" type="submit">로그아웃</button></form>}</div>
  </nav>;
}
