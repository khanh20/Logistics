import { cn } from "~/lib/utils/cn";
import { formatDate } from "~/lib/utils/format";
import { TRACKING_EVENT_ICON } from "~/lib/constants/logistics";
import type { TrackingEvent, TrackingEventType } from "~/lib/types/logistics";

interface PackageTimelineProps {
  events: TrackingEvent[];
}

// Hiển thị hành trình kiện hàng. BE trả mảng theo thứ tự thời gian — mốc đầu
// danh sách là mới nhất (highlight). typeLabel do BE cung cấp sẵn (tiếng Việt).
export function PackageTimeline({ events }: PackageTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic">
        Chưa có cập nhật hành trình.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-gray-200 space-y-6 pl-6">
      {events.map((ev, idx) => {
        const isFirst = idx === 0;
        const icon = TRACKING_EVENT_ICON[ev.type as TrackingEventType] ?? "📍";

        return (
          <li key={ev.id} className="relative">
            {/* Dot */}
            <span
              className={cn(
                "absolute -left-[1.625rem] flex items-center justify-center",
                "w-5 h-5 rounded-full ring-4 ring-white text-[10px]",
                isFirst ? "bg-primary text-white" : "bg-gray-200"
              )}
            >
              {isFirst ? (
                <span className="w-2 h-2 rounded-full bg-white block" />
              ) : null}
            </span>

            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    isFirst ? "text-primary" : "text-gray-700"
                  )}
                >
                  <span className="mr-1.5">{icon}</span>
                  {ev.typeLabel}
                </p>
                {ev.location && (
                  <p className="text-xs text-gray-500 mt-0.5">📍 {ev.location}</p>
                )}
                {ev.note && (
                  <p className="text-xs text-gray-500 mt-0.5">{ev.note}</p>
                )}
              </div>
              <time className="text-xs text-gray-400 shrink-0">
                {formatDate(ev.occuredAt)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
