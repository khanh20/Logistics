import { isRouteErrorResponse } from "react-router";

// Normalized error mà UI có thể hiển thị
export interface NormalizedError {
  status: number;           // 0 nếu không xác định (lỗi mạng / lỗi runtime)
  code?: string;            // errorCode từ BE (vd "FORBIDDEN", "NOT_FOUND")
  message: string;          // message thân thiện (đã được tinh chỉnh)
  rawMessage?: string;      // message gốc (debug)
  stack?: string;           // chỉ có ở DEV
}

// Map status code → key i18n mặc định
const STATUS_FALLBACK_KEY: Record<number, string> = {
  400: "errors.bad_request",
  401: "errors.unauthorized",
  403: "errors.forbidden",
  404: "errors.not_found",
  408: "errors.timeout",
  409: "errors.conflict",
  422: "errors.validation",
  429: "errors.too_many_requests",
  500: "errors.server",
  502: "errors.bad_gateway",
  503: "errors.unavailable",
  504: "errors.timeout",
};

// Lấy key i18n fallback theo status
export function getFallbackKey(status: number): string {
  if (status === 0) return "errors.network";
  return STATUS_FALLBACK_KEY[status] ?? "errors.generic";
}

// Cố gắng đọc field message/errorCode/status từ một error object bất kỳ
function readField<T = unknown>(obj: unknown, ...keys: string[]): T | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  for (const k of keys) {
    const v = (obj as Record<string, unknown>)[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

// Normalize bất kỳ lỗi nào (từ router, axios, BE response, JS Error) thành 1 shape thống nhất
export function normalizeError(error: unknown): NormalizedError {
  // 1. RouteErrorResponse (404 từ React Router, throw redirect, throw new Response...)
  if (isRouteErrorResponse(error)) {
    const data = error.data as unknown;
    const message =
      readField<string>(data, "message") ??
      error.statusText ??
      "";
    return {
      status: error.status,
      code: readField<string>(data, "errorCode", "code"),
      message: message || "",
      rawMessage: message,
    };
  }

  // 2. Axios error response data shape: { success: false, message, errorCode }
  //    (client.ts đã unwrap thành err.response.data)
  if (error && typeof error === "object") {
    const status = readField<number>(error, "status", "statusCode") ?? 0;
    const code   = readField<string>(error, "errorCode", "code");
    const msg    = readField<string>(error, "message");

    // Trường hợp object thực sự có message
    if (msg || code) {
      return {
        status,
        code,
        message: msg ?? "",
        rawMessage: msg,
      };
    }

    // Trường hợp object là AxiosError chưa unwrap (có response.data)
    const response = readField<Record<string, unknown>>(error, "response");
    if (response) {
      const rData = readField<Record<string, unknown>>(response, "data") ?? {};
      return {
        status: (readField<number>(response, "status") ?? 0),
        code: readField<string>(rData, "errorCode", "code"),
        message: readField<string>(rData, "message") ?? "",
        rawMessage: readField<string>(rData, "message"),
      };
    }
  }

  // 3. JS Error instance
  if (error instanceof Error) {
    return {
      status: 0,
      message: error.message,
      rawMessage: error.message,
      stack: error.stack,
    };
  }

  // 4. Unknown
  return {
    status: 0,
    message: typeof error === "string" ? error : "",
  };
}

// Trả ra key i18n + fallback message dựa trên NormalizedError
export function getErrorDisplay(
  err: NormalizedError,
  t: (key: string, opts?: Record<string, unknown>) => string
): { title: string; description: string } {
  const fallbackKey = getFallbackKey(err.status);

  // Title: dựa trên status
  let titleKey = "errors.generic_title";
  if (err.status === 401) titleKey = "errors.unauthorized_title";
  else if (err.status === 403) titleKey = "errors.forbidden_title";
  else if (err.status === 404) titleKey = "errors.not_found_title";
  else if (err.status === 408 || err.status === 504) titleKey = "errors.timeout_title";
  else if (err.status === 0) titleKey = "errors.network_title";
  else if (err.status >= 500) titleKey = "errors.server_title";

  // Description: ưu tiên message từ BE (nếu có & là text dễ hiểu), fallback theo i18n
  const beMessage = err.message?.trim();
  const description =
    beMessage && beMessage.length > 0 && beMessage.length < 300
      ? beMessage
      : t(fallbackKey);

  return {
    title: t(titleKey),
    description,
  };
}
