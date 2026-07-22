import { useEffect } from "react";
import { useAppSelector } from "~/lib/feature/hooks";

const AUTH_KEY = "muaho-auth";

// Đồng bộ danh tính giữa các tab.
//
// Redux chỉ đọc localStorage MỘT LẦN lúc tab khởi tạo, trong khi cookie phiên
// (muaho.access) lại dùng chung cho cả trình duyệt và backend có nhánh fallback
// đọc token từ cookie. Hệ quả: đăng xuất rồi đăng nhập tài khoản khác ở tab này
// thì tab kia vẫn HIỂN THỊ người cũ nhưng API đã trả dữ liệu người mới.
//
// Sự kiện `storage` chỉ bắn sang các tab KHÁC, đúng thứ cần: tab nào đổi tài khoản
// thì các tab còn lại tự nạp lại theo danh tính mới.
export function AuthTabSync() {
  const userId = useAppSelector((s) => s.authState.user?.id ?? null);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== null && e.key !== AUTH_KEY) return;

      let nextId: string | null = null;
      try {
        const raw = e.newValue ?? localStorage.getItem(AUTH_KEY);
        nextId = raw ? (JSON.parse(raw)?.user?.id ?? null) : null;
      } catch {
        nextId = null;
      }

      if (nextId === userId) return;

      // Nạp lại thay vì vá từng phần state: loader, cache và các component con đều
      // đang giữ dữ liệu của người cũ, chỉ reload mới đưa cả tab về một danh tính.
      if (nextId === null) window.location.href = "/login";
      else window.location.reload();
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [userId]);

  return null;
}
