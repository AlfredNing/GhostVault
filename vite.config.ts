import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * GhostVault build pipeline.
 *
 * The extension is produced in three sequential Vite builds, then merged
 * into a single dist/<target>/ folder by scripts/build.mjs:
 *   1. popup    — HTML entry (src/popup/index.html)
 *   2. background — service worker, IIFE (src/background/index.ts)
 *   3. content  — content script, IIFE (src/content/index.ts)
 */
export default defineConfig(({ mode }) => {
  const entry = (mode ?? "").replace(/^entry:/, "");

  if (entry === "background" || entry === "content") {
    return {
      plugins: [tailwindcss()],
      build: {
        outDir: `dist/.staging/${entry}`,
        emptyOutDir: true,
        minify: true,
        target: "chrome120",
        lib: {
          entry: `src/${entry}/index.ts`,
          name: entry,
          formats: ["iife"],
          fileName: () => `${entry}.js`,
        },
        rollupOptions: {
          output: {
            extend: true,
          },
        },
      },
      define: {
        "process.env.NODE_ENV": JSON.stringify("production"),
      },
    };
  }

  // popup entry (default)
  return {
    plugins: [react(), tailwindcss()],
    // Extension pages load via chrome-extension:// — relative paths only.
    base: "./",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    build: {
      outDir: "dist/.staging/popup",
      emptyOutDir: true,
      minify: true,
      target: "chrome120",
      rollupOptions: {
        input: {
          popup: "src/popup/index.html",
        },
        output: {
          // Deterministic file names so manifest.json references stay valid.
          assetFileNames: "assets/[name][extname]",
          chunkFileNames: "assets/[name].js",
          entryFileNames: "assets/[name].js",
        },
      },
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
  };
});
