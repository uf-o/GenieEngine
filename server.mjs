import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { createServer as createViteServer } from "vite";

const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";
const root = process.cwd();
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8"
};

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function generateWithGemini(prompt, history = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured. Add it in the Google AI Studio Secrets panel.");
    error.status = 503;
    throw error;
  }

  const contents = [
    ...history.slice(-10).map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: String(item.text || "").slice(0, 5000) }]
    })),
    { role: "user", parts: [{ text: prompt }] }
  ];

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: "You are GenieEngine, a practical game-development assistant. Help users design and prototype games. Keep answers concrete. When asked to create or modify a playable prototype, return a complete single-file HTML document in a fenced html code block. The HTML must be self-contained, use canvas or DOM, and must not load external scripts, remote assets, or make network requests. Do not claim that a generated prototype has been tested unless it actually has."
          }]
        },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
      })
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || "Gemini request failed.");
    error.status = response.status;
    throw error;
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim();
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

async function serveStatic(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = resolve(root, "dist", "." + pathname);
  if (!filePath.startsWith(resolve(root, "dist") + sep) && filePath !== resolve(root, "dist", "index.html")) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("Not a file");
    res.writeHead(200, { "content-type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(await readFile(filePath));
  } catch {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(await readFile(resolve(root, "dist", "index.html")));
  }
}

const vite = isProduction ? null : await createViteServer({
  configFile: resolve(root, "vite.config.js"),
  server: { middlewareMode: true },
  appType: "spa"
});

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/api/health") {
    return sendJson(res, 200, { ok: true, app: "GenieEngine Web", geminiConfigured: Boolean(process.env.GEMINI_API_KEY) });
  }

  if (req.method === "POST" && req.url === "/api/generate") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 100_000) req.destroy();
    });
    req.on("end", async () => {
      try {
        const body = JSON.parse(raw || "{}");
        const prompt = String(body.prompt || "").trim();
        if (!prompt) return sendJson(res, 400, { error: "Write a prompt first." });
        if (prompt.length > 12_000) return sendJson(res, 413, { error: "Prompt is too long (12,000 characters maximum)." });
        const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
        const answer = await generateWithGemini(prompt, history);
        return sendJson(res, 200, { answer });
      } catch (error) {
        return sendJson(res, error.status || 500, { error: error.message || "Unexpected server error." });
      }
    });
    return;
  }

  if (vite) {
    vite.middlewares(req, res, (error) => {
      if (error) {
        res.writeHead(500);
        res.end("Development server error");
      }
    });
    return;
  }

  return serveStatic(req, res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`GenieEngine Web listening on port ${port}`);
});
