import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import { fileURLToPath } from "node:url";
import path from "node:path";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const isWebOnly = process.env.VITE_WEB_ONLY === "1";

export default defineConfig({
  plugins: [
    react(),
    ...(!isWebOnly
      ? [
          electron({
            main: {
              entry: "src/electron/main/index.ts",
              vite: {
                build: {
                  outDir: "dist-electron/main",
                  emptyOutDir: true,
                  lib: {
                    entry: "src/electron/main/index.ts",
                    formats: ["cjs"],
                    fileName: () => "index.cjs",
                  },
                },
              },
            },
            preload: {
              input: "src/electron/preload/index.ts",
              vite: {
                build: {
                  outDir: "dist-electron/preload",
                  emptyOutDir: true,
                  rollupOptions: {
                    output: {
                      format: "cjs",
                      entryFileNames: "index.cjs",
                    },
                  },
                },
              },
            },
            renderer: {},
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@web": path.resolve(rootDir, "src/web"),
      "@electron": path.resolve(rootDir, "src/electron"),
      "@shared": path.resolve(rootDir, "src/shared"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/unit/setup.ts"],
    include: ["test/unit/**/*.test.ts", "test/unit/**/*.test.tsx"],
    coverage: {
      reporter: ["text", "html"],
      include: ["src/shared/**/*.ts", "src/web/**/*.ts", "src/web/**/*.tsx"],
    },
  },
} as any);
