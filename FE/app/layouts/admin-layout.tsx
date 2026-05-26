import { Outlet, redirect } from "react-router";
import { AdminSidebar } from "~/components/admin/AdminSidebar";
import { AdminTopbar } from "~/components/admin/AdminTopbar";
import { store } from "~/lib/feature/store";
import { ErrorState } from "~/components/shared/ErrorState";
import { useAuthStore } from "~/lib/stores/authStore";
import { STAFF_ROLES, type Role } from "~/lib/constants/roles";
import type { UserAuthInfo } from "~/lib/types/auth";
import type { Route } from "./+types/admin-layout";
import { ConfigProvider } from "antd";

export async function clientLoader() {
  const { token, user, roles } = store.getState().authState;

  if (!token || !user) throw redirect("/login");

  if (!roles.some((r) => STAFF_ROLES.includes(r as Role))) throw redirect("/");

  return { user };
}

export default function AdminLayout({ loaderData }: { loaderData: { user: UserAuthInfo } }) {
  const { user } = loaderData;

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#ef4444' } }}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <AdminSidebar user={user} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminTopbar user={user} />
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { user } = useAuthStore.getState();

  if (!user) {
    return <ErrorState error={error} fullScreen />;
  }

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#ef4444' } }}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <AdminSidebar user={user} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminTopbar user={user} />
          <main className="flex-1 overflow-auto">
            <ErrorState error={error} />
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
}
