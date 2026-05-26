import { Outlet, redirect } from "react-router";
import { AdminSidebar } from "~/components/admin/AdminSidebar";
import { AdminTopbar } from "~/components/admin/AdminTopbar";
import { ErrorState } from "~/components/shared/ErrorState";
import { useAuthStore } from "~/lib/stores/authStore";
import { STAFF_ROLES, type Role } from "~/lib/constants/roles";
import type { UserAuthInfo } from "~/lib/types/auth";
import type { Route } from "./+types/admin-layout";

export async function clientLoader() {
  const { token, user, roles } = useAuthStore.getState();

  if (!token || !user) throw redirect("/login");

  if (!roles.some((r) => STAFF_ROLES.includes(r as Role))) throw redirect("/");

  return { user };
}

export default function AdminLayout({ loaderData }: { loaderData: { user: UserAuthInfo } }) {
  const { user } = loaderData;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopbar user={user} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { user } = useAuthStore.getState();

  if (!user) {
    return <ErrorState error={error} fullScreen />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar user={user} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopbar user={user} />
        <main className="flex-1 overflow-auto">
          <ErrorState error={error} />
        </main>
      </div>
    </div>
  );
}
