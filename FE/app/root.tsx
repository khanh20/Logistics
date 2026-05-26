import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";
import { Result, Button, Typography } from "antd";

import type { Route } from "./+types/root";
import "./app.css";
import "~/lib/i18n";
import { Provider } from "react-redux";
import { store } from "~/lib/feature/store";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <Outlet />
    </Provider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Có lỗi xảy ra!";
  let details = "Hệ thống gặp sự cố không mong muốn.";
  let stack: string | undefined;
  let statusCode: 403 | 404 | 500 | "error" = "error";

  if (isRouteErrorResponse(error)) {
    statusCode = [403, 404, 500].includes(error.status) ? (error.status as 403 | 404 | 500) : "error";
    message = error.status === 404 ? "404 - Không tìm thấy trang" : `Lỗi ${error.status}`;
    details =
      error.status === 404
        ? "Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-3xl w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <Result
          status={statusCode}
          title={<span className="text-gray-800 font-bold">{message}</span>}
          subTitle={<span className="text-gray-500 text-base">{details}</span>}
          extra={
            <Button type="primary" size="large" className="bg-blue-600 hover:bg-blue-700 px-8 h-12 rounded-lg font-medium">
              <a href="/" className="text-white hover:text-white">Về trang chủ</a>
            </Button>
          }
        >
          {stack && (
            <div className="bg-gray-50 p-4 rounded-xl mt-8 text-left max-h-96 overflow-y-auto border border-gray-200">
              <Typography.Text type="danger">
                <pre className="text-xs font-mono m-0 whitespace-pre-wrap break-words">{stack}</pre>
              </Typography.Text>
            </div>
          )}
        </Result>
      </div>
    </div>
  );
}
