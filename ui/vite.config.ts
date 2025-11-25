import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { existsSync } from "fs";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from parent directory (.env.local or .env)
const parentDir = path.resolve(__dirname, "..");
const envLocalPath = path.join(parentDir, ".env.local");
const envPath = path.join(parentDir, ".env");

if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
} else if (existsSync(envPath)) {
  config({ path: envPath });
}

// Get HTTP port from environment variable, default to 4657
const httpPort = process.env.RESEND_SANDBOX_HTTP_PORT || "4657";

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
        target: `http://127.0.0.1:${httpPort}`,
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
