import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import { handleChatRequest } from "./server/chat-handler.js";

// =============================================================================
// Manus Debug Collector - Vite Plugin
// Writes browser logs directly to files, trimmed when exceeding size limit
// =============================================================================

const PROJECT_ROOT = import.meta.dirname;
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024; // 1MB per log file
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6); // Trim to 60% to avoid constant re-trimming

type LogSource = "browserConsole" | "networkRequests" | "sessionReplay";

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function trimLogFile(logPath: string, maxSize: number) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }

    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines: string[] = [];
    let keptBytes = 0;

    // Keep newest lines (from end) that fit within 60% of maxSize
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(lines[i], "utf-8") + 1;
      if (keptBytes + lineBytes > targetSize && keptLines.length > 0) {
        break;
      }
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }

    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
    // Non-blocking log trim error
  }
}

function appendLog(source: LogSource, data: any) {
  try {
    ensureLogDir();
    const logPath = path.join(LOG_DIR, `${source}.log`);
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${JSON.stringify(data)}\n`;
    fs.appendFileSync(logPath, entry, "utf-8");
    trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
  } catch {
    // Non-blocking log write error
  }
}

function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "vite-plugin-manus-debug-collector",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/__manus__/log" && req.method === "POST") {
          let body = "";
          req.on("data", chunk => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const { source, data } = JSON.parse(body);
              if (source && data) {
                appendLog(source, data);
              }
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: err?.message || "Invalid JSON" }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

function jsxLocPlugin(): Plugin {
  return {
    name: "jsx-loc-plugin",
    transform(code, id) {
      if (!id.endsWith(".tsx") && !id.endsWith(".jsx")) return;
      return code;
    }
  };
}

function vitePluginStorageProxy(): Plugin {
  return {
    name: "vite-plugin-storage-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/manus-storage/")) {
          next();
          return;
        }

        const apiKey = process.env.BUILT_IN_FORGE_API_KEY;
        const apiUrl = process.env.BUILT_IN_FORGE_API_URL;

        if (!apiKey || !apiUrl) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Storage proxy not configured");
          return;
        }

        const filename = req.url.replace("/manus-storage/", "");
        try {
          const forgeResp = await fetch(`${apiUrl}/v1/storage/signed-url?filename=${encodeURIComponent(filename)}`, {
            headers: {
              "Authorization": `Bearer ${apiKey}`,
            },
          });

          if (!forgeResp.ok) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Storage backend error");
            return;
          }

          const { url } = (await forgeResp.json()) as { url: string };
          if (!url) {
            res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("Empty signed URL");
            return;
          }

          res.writeHead(307, { Location: url, "Cache-Control": "no-store" });
          res.end();
        } catch {
          res.writeHead(502, { "Content-Type": "text/plain" });
          res.end("Storage proxy error");
        }
      });
    },
  };
}

function vitePluginChatApi(): Plugin {
  return {
    name: "vite-plugin-chat-api",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === "/api/chat" && req.method === "POST") {
          let body = "";
          req.on("data", chunk => {
            body += chunk;
          });
          req.on("end", async () => {
            try {
              const parsed = JSON.parse(body || "{}");
              (req as any).body = parsed;
              await handleChatRequest(req as any, res as any);
            } catch (err: any) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: err?.message || "Invalid JSON" }));
            }
          });
          return;
        }
        next();
      });
    }
  };
}

const plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector(), vitePluginStorageProxy(), vitePluginChatApi()];

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 3500, // Ajusté pour le bundle Warframe
  },
  server: {
    port: 3000,
    strictPort: false, // Will find next available port if 3000 is busy
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
