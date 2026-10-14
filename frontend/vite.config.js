import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The frontend dev server proxies /api calls to the Flask backend,
// so there is no CORS trouble and no API URL to hardcode in components.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
});
