import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/miniapp/",
  plugins: [react()],
  server: { proxy: { "/api": "http://127.0.0.1:3001", "/media": "http://127.0.0.1:3001" } },
});
