/**
 * 本地开发用代理：node qwen-proxy.mjs
 * 环境变量 DASHSCOPE_API_KEY；浏览器助手默认连接 http://127.0.0.1:8787
 * 与 Netlify Function 行为一致：无密钥时返回演示文案
 */
import http from "http";

const PORT = Number(process.env.PORT) || 8787;
const OPENAI_COMPAT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

function mockResponse(body) {
  let parsed = {};
  try {
    parsed = JSON.parse(body || "{}");
  } catch {}
  const msgs = parsed.messages || [];
  const lastUser = [...msgs].reverse().find((m) => m.role === "user");
  const preview = lastUser?.content ? String(lastUser.content).slice(0, 200) : "";
  const reply =
    "【BioStarts · 演示模式】本地未设置 DASHSCOPE_API_KEY。export 或 .env 配置后可走真实千问。" +
    (preview ? "\n\n预览：" + preview : "");
  return JSON.stringify({
    choices: [{ message: { role: "assistant", content: reply } }],
    object: "chat.completion",
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method !== "POST" || req.url !== "/") {
    res.writeHead(req.method === "POST" ? 404 : 405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "POST / only" }));
    return;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks).toString("utf8");

  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(mockResponse(body));
    return;
  }

  try {
    const r = await fetch(OPENAI_COMPAT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body,
    });
    const text = await r.text();
    res.writeHead(r.ok ? 200 : r.status, { "Content-Type": "application/json" });
    res.end(text);
  } catch (e) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("qwen-proxy listening on http://127.0.0.1:" + PORT);
});
