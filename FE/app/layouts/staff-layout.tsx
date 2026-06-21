import { Outlet, redirect } from "react-router";
import { StaffSidebar } from "~/components/staff/StaffSidebar";
import { AdminTopbar } from "~/components/admin/AdminTopbar";
import { ErrorState } from "~/components/shared/ErrorState";
import { store } from "~/lib/feature/store";
import { PORTAL_ROLES, type Role } from "~/lib/constants/roles";
import { staffPortalApi } from "~/lib/api/staff";
import { useFetch } from "~/lib/hooks/useFetch";
import type { UserAuthInfo } from "~/lib/types/auth";

// Guard ĐỒNG BỘ (đọc store, không await) → vào màn hình ngay, không chặn.
export async function clientLoader() {
  const { token, user, roles } = store.getState().authState;
  if (!token || !user) throw redirect("/login");
  if (!roles.some((r) => PORTAL_ROLES.includes(r as Role))) throw redirect("/");
  return { user };
}

function StaffShell({ user }: { user: UserAuthInfo }) {
  // Unread count tải non-blocking (không chặn render layout).
  const { data: unreadCount } = useFetch<number>(
    () => staffPortalApi.getUnreadCount().then((r) => r.data ?? 0),
    []
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <StaffSidebar user={user} unreadCount={unreadCount ?? 0} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar user={user} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function StaffLayout({ loaderData }: { loaderData: { user: UserAuthInfo } }) {
  return <StaffShell user={loaderData.user} />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  const { user } = store.getState().authState;
  if (!user) return <ErrorState error={error} fullScreen />;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <StaffSidebar user={user} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar user={user} />
        <main className="flex-1 overflow-auto p-6">
          <ErrorState error={error} />
        </main>
      </div>
    </div>
  );
}
