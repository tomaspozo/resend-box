import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../dist/ui",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/sandbox": {
        target: "http://localhost:4657",
        changeOrigin: true,
      },
    },
    // Ensure SPA routing works - Vite handles this by default, but explicit config helps
    fs: {
      // Allow serving files from one level up to the project root
      allow: [".."],
    },
  },
});
