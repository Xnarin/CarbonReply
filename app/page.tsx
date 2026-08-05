import { NewProjectForm } from "@/components/new-project-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f4f5f2] px-5 py-8 text-[#1d2a24] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between border-b border-[#cad3ca] pb-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#4d7a62]">
              CARBONREPLY
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">탄소길잡이</h1>
          </div>
          <span className="rounded-full border border-[#b8cdbd] bg-white px-3 py-1.5 text-xs font-medium text-[#487158]">
            Scope 2 응답 도우미
          </span>
        </header>

        <section className="grid gap-8 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-20">
          <div>
            <p className="text-sm font-medium text-[#4d7a62]">새 산정 프로젝트</p>
            <h2 className="mt-3 max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              전기요금 고지서로
              <br />
              탄소 응답을 시작하세요.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#5d6c63]">
              고지서에서 월별 전력 사용량을 읽고, 누락된 자료와 확인이 필요한 값을 찾아드립니다.
              계산 결과는 산정 근거와 함께 정리됩니다.
            </p>

            <ol className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["01", "프로젝트 생성", "회사와 산정 연도를 정합니다."],
                ["02", "고지서 업로드", "PDF에서 사용량을 추출합니다."],
                ["03", "결과 확인", "이슈를 확인하고 응답을 완성합니다."],
              ].map(([number, title, description]) => (
                <li key={number} className="border-l border-[#9bb7a4] pl-4">
                  <p className="text-xs font-semibold tracking-wider text-[#4d7a62]">{number}</p>
                  <p className="mt-1 font-medium">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#66756b]">{description}</p>
                </li>
              ))}
            </ol>
          </div>

          <NewProjectForm />
        </section>
      </div>
    </main>
  );
}
