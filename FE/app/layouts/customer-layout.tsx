import { Outlet } from "react-router";
import { CustomerNavbar } from "~/components/customer/CustomerNavbar";

export default function CustomerLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <CustomerNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-200 py-6 mt-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500">
          © 2026 MuaHo Logistics
        </div>
      </footer>
    </div>
  );
}
