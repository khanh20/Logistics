// Khoá phiên cho khách ẩn danh — để track hành vi + recommend khi chưa đăng nhập.
const KEY = "muaho_sid";

export function getSessionKey(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem(KEY);
  if (!sid) {
    sid = crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(KEY, sid);
  }
  return sid;
}
