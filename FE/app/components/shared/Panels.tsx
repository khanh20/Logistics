import type { ReactNode } from "react";
import { cn } from "~/lib/utils/cn";

// Tiêu đề khu — heading dùng font-heading (Outfit) + tracking-tight, sentence case.
export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export interface StatItem {
  label: string;
  value: string | number;
  accent?: "default" | "primary" | "danger" | "success" | "blue";
  icon?: ReactNode;
}

const ACCENT: Record<NonNullable<StatItem["accent"]>, string> = {
  default: "text-slate-900",
  primary: "text-primary",
  danger:  "text-red-600",
  success: "text-emerald-600",
  blue:    "text-blue-600",
};

// Cụm số liệu nhóm bằng divide thay vì mỗi số 1 card (taste-skill: anti-card-overuse).
// Số dùng tabular-nums để cân cột.
export function StatGroup({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid divide-y divide-slate-100 rounded-2xl border border-slate-200/70 bg-white",
        "sm:grid-flow-col sm:auto-cols-fr sm:divide-x sm:divide-y-0",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}
    >
      {items.map((s, i) => (
        <div key={i} className="px-5 py-4">
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            {s.icon}
            {s.label}
          </div>
          <p className={cn("mt-1.5 text-2xl font-bold tabular-nums", ACCENT[s.accent ?? "default"])}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// Empty state có icon + hướng dẫn (taste-skill: empty state đẹp).
export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      {icon && <div className="mb-3 text-slate-300">{icon}</div>}
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
