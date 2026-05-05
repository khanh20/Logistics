import { Outlet } from "react-router";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <a href="/" className="inline-flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">MuaHo</span>
          <span className="text-2xl font-light text-gray-600">Logistics</span>
        </a>
        <p className="mt-1 text-sm text-gray-500"></p>
      </div>
      <Outlet />
    </div>
  );
}
