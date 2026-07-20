import { useEffect } from "react";
import { useAppSelector } from "~/lib/feature/hooks";
import { pushAuthToExtension } from "~/lib/extension/bridge";

// Đẩy access token sang MuaHo Extension mỗi khi token đổi (đăng nhập / làm mới / khôi phục
// từ localStorage) và xoá khi đăng xuất. Nhờ vậy extension dùng chung phiên đăng nhập của
// FE mà KHÔNG cần đọc cookie — cần thiết khi FE deploy khác domain với backend (cookie bị
// chặn third-party). Không render gì.
export function AuthExtensionSync() {
  const token = useAppSelector((s) => s.authState.token);
  useEffect(() => {
    pushAuthToExtension(token || null);
  }, [token]);
  return null;
}
