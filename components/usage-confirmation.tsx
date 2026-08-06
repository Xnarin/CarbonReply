"use client";

import { FormEvent, ReactNode, createContext, useContext, useState, useTransition } from "react";
import { confirmAllMonthlyUsage, confirmMonthlyUsage } from "@/app/actions/review";

type OptimisticContextValue = {
  allOptimistic: boolean;
  setAllOptimistic: (value: boolean) => void;
};

const OptimisticContext = createContext<OptimisticContextValue | null>(null);

export function ConfirmationOptimisticProvider({ children }: { children: ReactNode }) {
  const [allOptimistic, setAllOptimistic] = useState(false);
  return <OptimisticContext.Provider value={{ allOptimistic, setAllOptimistic }}>{children}</OptimisticContext.Provider>;
}

function useConfirmationOptimistic() {
  const context = useContext(OptimisticContext);
  if (!context) throw new Error("Confirmation controls must be inside ConfirmationOptimisticProvider.");
  return context;
}

export function ConfirmAllUsageForm({ allConfirmed, disabled, projectId }: { allConfirmed: boolean; disabled: boolean; projectId: string }) {
  const { allOptimistic, setAllOptimistic } = useConfirmationOptimistic();
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || isPending || allConfirmed) return;
    const formData = new FormData(event.currentTarget);
    setFailed(false);
    setAllOptimistic(true);
    startTransition(async () => {
      const result = await confirmAllMonthlyUsage(formData);
      if (!result.ok) {
        setAllOptimistic(false);
        setFailed(true);
      }
    });
  }

  const label = isPending ? "전체 확정됨 · 저장 중" : allConfirmed || allOptimistic ? "전체 확정됨" : "전체 사용량 확정";
  return <div className="optimistic-confirm-wrap"><form onSubmit={submit}><input name="projectId" type="hidden" value={projectId} /><button className={`confirm-all-button ${allOptimistic ? "is-optimistic" : ""}`} disabled={disabled || isPending || allConfirmed} type="submit">{label}</button></form>{failed ? <small className="confirmation-error" role="alert">저장하지 못했습니다. 다시 시도해 주세요.</small> : null}</div>;
}

export function UsageConfirmationCells({ confirmed, emissionsKg, kwh, month, monthLabel, projectId }: { confirmed: boolean; emissionsKg: number; kwh: number; month: string; monthLabel: string; projectId: string }) {
  const { allOptimistic } = useConfirmationOptimistic();
  const [localConfirmed, setLocalConfirmed] = useState(confirmed);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const displayConfirmed = confirmed || localConfirmed || allOptimistic;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending || allOptimistic) return;
    const formData = new FormData(event.currentTarget);
    setFailed(false);
    setLocalConfirmed(true);
    startTransition(async () => {
      const result = await confirmMonthlyUsage(formData);
      if (!result.ok) {
        setLocalConfirmed(confirmed);
        setFailed(true);
      }
    });
  }

  return <>
    <td><form className="usage-form" onSubmit={submit}><input name="projectId" type="hidden" value={projectId} /><input name="month" type="hidden" value={month} /><input aria-label={`${monthLabel} 전기 사용량`} defaultValue={kwh} max="100000000" min="0" name="kwh" step="0.01" type="number" /><span>kWh</span><button className={`confirm-usage-button ${displayConfirmed ? "is-optimistic" : ""}`} disabled={isPending || allOptimistic} type="submit">{isPending ? "확정됨 · 저장 중" : confirmed ? "수정값 확정" : displayConfirmed ? "확정됨" : "이 값 확정"}</button></form></td>
    <td>{emissionsKg.toFixed(1)} kgCO₂e</td>
    <td><span className={`review-status ${displayConfirmed ? "is-confirmed" : ""} ${isPending || allOptimistic ? "is-saving" : ""}`}>{isPending || allOptimistic ? "확정됨 · 저장 중" : displayConfirmed ? "확정됨" : "확인 필요"}</span>{failed ? <small className="confirmation-error" role="alert">저장 실패</small> : null}</td>
  </>;
}
