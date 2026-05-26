import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/Button";
import { cn } from "~/lib/utils/cn";
import { normalizeError, getErrorDisplay, type NormalizedError } from "~/lib/utils/errors";

export interface ErrorStateProps {
  // Hoặc truyền error raw (sẽ tự normalize) hoặc đã normalize sẵn
  error?: unknown;
  normalized?: NormalizedError;

  // Override
  title?: string;
  description?: string;

  // UI options
  fullScreen?: boolean;        // chiếm toàn màn (cho ErrorBoundary root)
  showHomeButton?: boolean;    // mặc định: true
  showRetryButton?: boolean;   // mặc định: true (chỉ hiện nếu có onRetry hoặc reload)
  showLoginButton?: boolean;   // tự bật khi status = 401
  onRetry?: () => void;        // callback retry; nếu không truyền sẽ reload page

  className?: string;
}

// Icon SVG đơn giản inline để tránh thêm dependency
function ErrorIcon({ status }: { status: number }) {
  // 401/403: ổ khoá
  if (status === 401 || status === 403) {
    return (
      <svg viewBox="0 0 24 24" className="size-16 text-amber-500" fill="none"
        stroke="currentColor" strokeWidth={1.5}>
        <rect x="4" y="11" width="16" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 1 1 8 0v4" />
      </svg>
    );
  }
  // 404: kính lúp
  if (status === 404) {
    return (
      <svg viewBox="0 0 24 24" className="size-16 text-blue-500" fill="none"
        stroke="currentColor" strokeWidth={1.5}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4.3-4.3" />
        <path d="M11 8v3M11 14h.01" />
      </svg>
    );
  }
  // 0 (mạng): wifi-off
  if (status === 0) {
    return (
      <svg viewBox="0 0 24 24" className="size-16 text-gray-500" fill="none"
        stroke="currentColor" strokeWidth={1.5}>
        <path d="M2 8.82a15 15 0 0 1 20 0" />
        <path d="M5 12.86a10 10 0 0 1 14 0" />
        <path d="M8.5 16.42a5 5 0 0 1 7 0" />
        <circle cx="12" cy="20" r="0.5" fill="currentColor" />
        <path d="m2 2 20 20" />
      </svg>
    );
  }
  // 5xx: server warning
  if (status >= 500) {
    return (
      <svg viewBox="0 0 24 24" className="size-16 text-red-500" fill="none"
        stroke="currentColor" strokeWidth={1.5}>
        <rect x="3" y="4" width="18" height="6" rx="1" />
        <rect x="3" y="14" width="18" height="6" rx="1" />
        <path d="M7 7h.01M7 17h.01" />
        <path d="m13.5 14 3 6M16.5 14l-3 6" />
      </svg>
    );
  }
  // generic: warning triangle
  return (
    <svg viewBox="0 0 24 24" className="size-16 text-red-500" fill="none"
      stroke="currentColor" strokeWidth={1.5}>
      <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function ErrorState({
  error,
  normalized,
  title,
  description,
  fullScreen = false,
  showHomeButton = true,
  showRetryButton = true,
  showLoginButton,
  onRetry,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const err = normalized ?? normalizeError(error);
  const display = getErrorDisplay(err, t);

  const finalTitle = title ?? display.title;
  const finalDescription = description ?? display.description;

  // Tự động hiển thị nút Login khi 401
  const wantLogin = showLoginButton ?? err.status === 401;

  function handleRetry() {
    if (onRetry) onRetry();
    else if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center px-4",
        fullScreen ? "min-h-screen bg-gray-50" : "min-h-[60vh]",
        className
      )}
    >
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-5">
          <ErrorIcon status={err.status} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {finalTitle}
        </h1>

        <p className="text-sm text-gray-600 mb-1">
          {finalDescription}
        </p>
        {(err.status > 0 || err.code) && (
          <p className="text-xs text-gray-400 mb-6">
            {err.status > 0 && (
              <span>{t("errors.status_label")}: {err.status}</span>
            )}
            {err.status > 0 && err.code && <span> · </span>}
            {err.code && <span>{err.code}</span>}
          </p>
        )}
        {(err.status === 0 && !err.code) && <div className="mb-6" />}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {showRetryButton && (
            <Button onClick={handleRetry} variant="primary">
              {t("errors.btn_retry")}
            </Button>
          )}
          {wantLogin && (
            <Button onClick={() => navigate("/login")} variant="secondary">
              {t("errors.btn_login")}
            </Button>
          )}
          {showHomeButton && (
            <Button variant="secondary" type="button" onClick={() => navigate("/")}>
              {t("errors.btn_home")}
            </Button>
          )}
        </div>

        {/* Stack trace chỉ trong DEV */}
        {import.meta.env.DEV && err.stack && (
          <details className="mt-8 text-left">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
              {t("errors.dev_details")}
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-gray-700 overflow-x-auto">
              {err.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
