import { cn } from "~/lib/utils/cn";

// Skeleton shimmer — taste-skill: dùng skeleton loader khớp layout thay vì spinner.
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200/70",
        className
      )}
    />
  );
}

// Skeleton 1 hàng bảng (n cột).
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={cn("h-4", i === 0 ? "w-40" : "w-20")} />
      ))}
    </div>
  );
}

// Khối skeleton cho trang list/dashboard.
export function SkeletonPanel({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white">
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} cols={cols} />
        ))}
      </div>
    </div>
  );
}

// Skeleton cho cụm StatGroup (n ô số liệu).
export function StatGroupSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid divide-y divide-slate-100 rounded-2xl border border-slate-200/70 bg-white sm:divide-x sm:divide-y-0"
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0,1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2 px-5 py-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-12" />
        </div>
      ))}
    </div>
  );
}

// Skeleton danh sách thẻ (notifications, cards...).
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white p-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
