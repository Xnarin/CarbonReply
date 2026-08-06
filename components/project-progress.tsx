import { signOut } from "@/app/actions/auth";
import Link from "next/link";

const steps = ["산정 설정", "고지서 업로드", "추출 결과 확인", "결과 리포트"];

export function ProjectProgress({ activeStep, onLogout }: { activeStep: 1 | 2 | 3 | 4; projectId?: string; onLogout?: typeof signOut }) {
  return <nav className="project-progress" aria-label="산정 진행 단계">
    <Link className="brand" href="/"><span className="brand-kicker">CARBONREPLY</span><span>탄소길잡이</span></Link>
    <div className="steps">{steps.map((title, index) => { const number = index + 1; const completed = number < activeStep; return <div className="progress-step-wrap" key={title}>{index > 0 ? <span className="step-line" /> : null}<div className={`step ${number === activeStep ? "step-active" : ""}`}><span className={`step-number ${completed ? "step-complete" : ""}`}>{completed ? "✓" : number}</span>{title}</div></div>; })}</div>
    {onLogout ? <div className="account-area"><span className="account-label">협력사 탄소데이터 응답</span><button className="logout-button" formAction={onLogout} type="submit">로그아웃</button></div> : <div className="progress-spacer" aria-hidden="true" />}
  </nav>;
}
