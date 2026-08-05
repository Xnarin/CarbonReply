"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createProject, initialProjectState } from "@/app/actions/projects";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="mt-7 inline-flex w-full items-center justify-center rounded-lg bg-[#235c3a] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#19492e] disabled:cursor-not-allowed disabled:bg-[#9db3a4]"
      disabled={pending}
      type="submit"
    >
      {pending ? "프로젝트를 만드는 중…" : "고지서 업로드 시작"}
    </button>
  );
}

export function NewProjectForm() {
  const [state, formAction] = useActionState(createProject, initialProjectState);
  const currentYear = new Date().getFullYear();

  return (
    <section className="rounded-2xl border border-[#c9d6cb] bg-white p-6 shadow-[0_16px_40px_rgba(35,65,46,0.08)] sm:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">산정 정보 입력</h2>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#dfeee2] text-xs font-bold text-[#235c3a]">
          1
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#66756b]">
        먼저 이번 응답에 사용할 회사와 연도를 입력해 주세요.
      </p>

      <form action={formAction} className="mt-7 space-y-5">
        <label className="block text-sm font-medium">
          회사명
          <input
            className="mt-2 w-full rounded-lg border border-[#bdcbbf] bg-white px-3 py-3 text-base outline-none transition placeholder:text-[#9ba79e] focus:border-[#43815a] focus:ring-4 focus:ring-[#dceee1]"
            defaultValue=""
            name="companyName"
            placeholder="예: 대성정밀 주식회사"
            required
          />
        </label>

        <fieldset>
          <legend className="text-sm font-medium">산정 연도</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[currentYear - 2, currentYear - 1, currentYear].map((year) => (
              <label
                key={year}
                className="cursor-pointer rounded-lg border border-[#bdcbbf] px-2 py-3 text-center text-sm font-medium transition has-[:checked]:border-[#235c3a] has-[:checked]:bg-[#e8f4eb] has-[:checked]:text-[#17482c]"
              >
                <input
                  className="sr-only"
                  defaultChecked={year === currentYear}
                  name="targetYear"
                  type="radio"
                  value={year}
                />
                {year}
              </label>
            ))}
          </div>
        </fieldset>

        {state.error ? (
          <p className="rounded-lg bg-[#fff1ed] px-3 py-2.5 text-sm text-[#9d321c]" role="alert">
            {state.error}
          </p>
        ) : null}

        <SubmitButton />
      </form>

      <p className="mt-4 text-center text-xs leading-5 text-[#77857b]">
        다음 단계에서 전기요금 고지서 PDF를 여러 장 한 번에 올릴 수 있습니다.
      </p>
    </section>
  );
}
