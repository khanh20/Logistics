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
    noExternal: [
      /^antd/,
      /^@ant-design/,
      /^@rc-component/,
      /rc-.*/,
      "@ctrl/tinycolor",
      "@emotion/hash",
      "react-toastify",
    ],
  },
});
