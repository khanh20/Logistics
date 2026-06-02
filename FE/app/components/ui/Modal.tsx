import { useEffect } from "react";
import { cn } from "~/lib/utils/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  // Kích thước tối đa của panel.
  maxWidth?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const widths: Record<NonNullable<ModalProps["maxWidth"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "lg",
  className,
}: ModalProps) {
  // Đóng bằng phím Esc + khóa scroll nền khi mở.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full bg-white rounded-2xl shadow-xl my-8",
          widths[maxWidth],
          className
        )}
      >
        {title != null && (
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              aria-label="Đóng"
            >
              ×
            </button>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
