import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    dedupe: ["react", "react-dom"],
    tsconfigPaths: true,
  },
  ssr: {
    // Inline antd + rc-* để CSS-in-JS / ESM hoạt động khi SSR.
    noExternal: [
      /^antd/,
      /^@ant-design/,
      /^@rc-component/,
      /rc-.*/,
      "@ctrl/tinycolor",
      "@emotion/hash",
      "react-toastify",
    ],
    // Ép esbuild prebundle các package icon antd cho môi trường SSR → CJS→ESM sạch,
    // tránh "exports is not defined" trong module-runner của Vite dev.
    optimizeDeps: {
      include: ["@ant-design/icons", "@ant-design/icons/es/icons/*", "@ant-design/icons-svg"],
    },
  },
});
