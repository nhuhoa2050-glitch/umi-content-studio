// Local dev server (không cần Vercel). Chạy: npm run dev
// Đọc .env nếu có, phục vụ public/ và route /api/generate.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSkill, resolveProvider } from "./lib/generate.js";
import { getSkill, skillsMeta } from "./lib/skills.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Nạp .env thủ công (không cần dependency)
try {
  const envFile = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
  for (const line of envFile.split("\n")) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  /* không có .env cũng được */
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function serveStatic(req, res) {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(__dirname, "public", urlPath);
  if (!filePath.startsWith(path.join(__dirname, "public"))) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404).end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const path0 = req.url.split("?")[0];

  if (path0 === "/api/skills") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ skills: skillsMeta() }));
    return;
  }

  if (path0 === "/api/generate") {
    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Chỉ chấp nhận POST." }));
      return;
    }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const { productInfo, imageDataUrl, apiKey, model, baseUrl, skillId } = JSON.parse(body || "{}");
        const id = skillId || "quick-plan";
        const skill = getSkill(id);
        if (!skill) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Skill không tồn tại: ${id}` }));
          return;
        }
        const cfg = resolveProvider({
          apiKey: apiKey || process.env.OPENAI_API_KEY,
          model: model || process.env.OPENAI_MODEL,
          baseUrl: baseUrl || process.env.OPENAI_BASE_URL,
        });
        const result = await generateSkill(id, { productInfo, imageDataUrl }, cfg);
        const meta = { id: skill.id, name: skill.name, icon: skill.icon };
        const payload = skill.structured
          ? { type: "plan", plan: result, skill: meta }
          : { type: "markdown", markdown: result, skill: meta };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(payload));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message || "Lỗi không xác định." }));
      }
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`\n  🌊 Umi Content Studio chạy tại  http://localhost:${PORT}`);
  console.log(`  → Mở web, bấm '⚙️ Cấu hình API', dán key Groq miễn phí (console.groq.com/keys) là dùng ngay.`);
  if (process.env.OPENAI_API_KEY) {
    console.log(`  → (Đã có key trong .env — không cần nhập trên web.)`);
  }
  console.log("");
});
