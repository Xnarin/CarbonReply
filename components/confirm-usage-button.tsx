"use client";

import { useFormStatus } from "react-dom";

export function ConfirmUsageButton({ confirmed, all = false, disabled = false }: { confirmed?: boolean; all?: boolean; disabled?: boolean }) {
  const { pending } = useFormStatus();
  const label = all ? "전체 사용량 확정" : confirmed ? "수정값 확정" : "이 값 확정";
  return <button className={all ? "confirm-all-button" : "confirm-usage-button"} disabled={pending || disabled} type="submit">{pending ? "확정 중…" : label}</button>;
}
