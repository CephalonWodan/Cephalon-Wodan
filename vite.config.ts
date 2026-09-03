// =============================================================================
// Vite Configuration — Warframe Set Builder
// =============================================================================

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import { handleChatRoute } from "./server/chat-route.js";

const PROJECT_ROOT = import.meta.dirname;
const CLIENT_ROOT = path.resolve(PROJECT_ROOT, "client");
const LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
const MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
const TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);

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
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}\n`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {}
}

function writeToLogFile(source: LogSource, entries: unknown[]) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const timestamp = new Date().toISOString();
    const payload = typeof entry === "string" ? { message: entry } : entry;
    return `[${timestamp}] ${JSON.stringify(payload)}`;
  });
  try {
    trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
    fs.appendFileSync(logPath, `${lines.join("\n")}\n`, "utf-8");
  } catch {}
}

function jsxLocPlugin(): Plugin {
  return {
    name: "vite-plugin-jsx-loc",
    transform(code, id) {
      if (!id.endsWith(".tsx") && !id.endsWith(".jsx")) return;
      return code;
    },
  };
}

function vitePluginManusDebugCollector(): Plugin {
  return {
    name: "manus-debug-collector",
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (req.url === "/__manus__/logs" && req.method === "POST") {
          let body = "";
          req.on("data", chunk => (body += chunk));
          req.on("end", () => {
            try {
              const { source, entries } = JSON.parse(body);
              if (source && Array.isArray(entries)) {
                writeToLogFile(source, entries);
              }
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: true }));
            } catch {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Invalid payload" }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

function vitePluginStorageProxy(): Plugin {
  return {
    name: "manus-storage-proxy",
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/manus-storage/")) {
          return next();
        }
        try {
          const filename = path.basename(req.url);
          const assetPath = path.join(PROJECT_ROOT, "client", "public", "assets", filename);
          if (fs.existsSync(assetPath)) {
            const data = fs.readFileSync(assetPath);
            const ext = path.extname(filename).toLowerCase();
            const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".svg" ? "image/svg+xml" : "application/octet-stream";
            res.writeHead(200, { "Content-Type": mime, "Cache-Control": "public, max-age=31536000" });
            res.end(data);
            return;
          }
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not found");
        } catch {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Proxy error");
        }
      });
    },
  };
}

function vitePluginChatApi(): Plugin {
  return {
    name: "vite-plugin-chat-api",
    configureServer(server: ViteDevServer) {
      const originalMiddlewares = [...server.middlewares.stack];
      server.middlewares.stack = [];

      server.middlewares.use(async (req, res, next) => {
        if (req.url === "/api/chat" && req.method === "POST") {
          let bodyData = (req as any).body;
          if (!bodyData || typeof bodyData !== "object") {
            bodyData = await new Promise((resolve) => {
              let data = "";
              const timer = setTimeout(() => resolve(data), 2000);
              req.on("data", chunk => { data += chunk; });
              req.on("end", () => {
                clearTimeout(timer);
                resolve(data);
              });
              req.on("error", () => {
                clearTimeout(timer);
                resolve(data);
              });
            });
            try {
              if (typeof bodyData === "string") {
                bodyData = bodyData ? JSON.parse(bodyData) : {};
              }
            } catch {
              bodyData = {};
            }
          }
          (req as any).body = bodyData;

          try {
            await handleChatRoute(req as any, res as any);
          } catch (err: any) {
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ reply: "⚠️ Erreur interne du serveur de chat." }));
            }
          }
          return;
        }
        next();
      });

      for (const m of originalMiddlewares) {
        server.middlewares.stack.push(m);
      }
    }
  };
}

export default defineConfig({
  // The Vite entry point lives in client/index.html, not at the repository root.
  root: CLIENT_ROOT,
  plugins: [
    tailwindcss(),
    react(),
    jsxLocPlugin(),
    vitePluginManusDebugCollector(),
    vitePluginStorageProxy(),
    vitePluginChatApi(),
    vitePluginManusRuntime(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(PROJECT_ROOT, "client"),
      "@shared": path.resolve(PROJECT_ROOT, "shared"),
    },
  },
  build: {
    outDir: path.resolve(PROJECT_ROOT, "dist/public"),
    emptyOutDir: true,
  },
});
