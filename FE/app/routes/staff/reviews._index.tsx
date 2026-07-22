import { redirect } from "react-router";
import { ReviewsModerationView } from "../admin/reviews._index";
import { store } from "~/lib/feature/store";
import { PERMISSIONS } from "~/lib/constants/permissions";

export function meta() {
  return [{ title: "Kiểm duyệt đánh giá — MuaHo" }];
}

// staff-layout cho mọi role nhân viên vào portal, nhưng chỉ NV mua hàng/CSKH có
// review.moderate. Không chặn ở đây thì NV kho/kế toán gõ URL vào được và chỉ thấy
// màn hình rỗng kèm 403 từ BE.
export async function clientLoader() {
  const { permissions } = store.getState().authState;
  if (!permissions.includes(PERMISSIONS.REVIEW_MODERATE)) throw redirect("/staff");
  return null;
}

export default function StaffReviewsPage() {
  return <ReviewsModerationView />;
}
