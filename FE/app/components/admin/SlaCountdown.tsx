import { useEffect, useState } from "react";
import { cn } from "~/lib/utils/cn";

interface SlaCountdownProps {
  deadline: string;   // ISO datetime string
  className?: string;
}

function calcRemaining(deadline: string) {
  const diff = new Date(deadline).getTime() - Date.now();
  return diff; // ms; âm = đã quá hạn
}

function formatDuration(ms: number): string {
  if (ms <= 0) {
    const over = Math.abs(ms);
    const h = Math.floor(over / 3_600_000);
    const m = Math.floor((over % 3_600_000) / 60_000);
    return `Quá hạn ${h > 0 ? `${h}h ` : ""}${m}p`;
  }
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `Còn ${h}h ${m}p`;
  return `Còn ${m}p`;
}

/// Hiển thị thời gian còn lại đến SLA deadline.
/// Màu đỏ khi < 2h hoặc đã quá hạn, vàng khi < 6h, xanh khi còn nhiều.
export function SlaCountdown({ deadline, className }: SlaCountdownProps) {
  const [remaining, setRemaining] = useState(() => calcRemaining(deadline));

  useEffect(() => {
    // Cập nhật mỗi 30 giây
    const id = setInterval(() => setRemaining(calcRemaining(deadline)), 30_000);
    return () => clearInterval(id);
  }, [deadline]);

  const isOverdue = remaining <= 0;
  const isCritical = remaining > 0 && remaining < 2 * 3_600_000;   // < 2h
  const isWarning  = remaining > 0 && remaining < 6 * 3_600_000;   // < 6h

  const colorClass = isOverdue
    ? "text-red-600 bg-red-50 border-red-200"
    : isCritical
    ? "text-red-500 bg-red-50 border-red-200"
    : isWarning
    ? "text-yellow-600 bg-yellow-50 border-yellow-200"
    : "text-green-700 bg-green-50 border-green-200";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        colorClass,
        className
      )}
      title={`SLA Deadline: ${new Date(deadline).toLocaleString("vi-VN")}`}
    >
      {isOverdue ? "⚠️" : "⏱"} {formatDuration(remaining)}
    </span>
  );
}
