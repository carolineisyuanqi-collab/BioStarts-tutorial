/**
 * Netlify Function：转发千问 OpenAI 兼容接口，或在未配置密钥时返回演示文案。
 * Netlify 控制台 → Environment variables：
 *   DASHSCOPE_API_KEY — 阿里云 DashScope API Key（可选）
 *   MOCK_QWEN — 设为 true 则始终演示模式，不调用外网
 */
const OPENAI_COMPAT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: cors,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const mockEnv =
    process.env.MOCK_QWEN === "true" ||
    process.env.MOCK_QWEN === "1" ||
    !process.env.DASHSCOPE_API_KEY;

  if (mockEnv) {
    const msgs = body.messages || [];
    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    const preview = lastUser?.content ? String(lastUser.content).slice(0, 200) : "";
    const reply =
      "【BioStarts · 演示模式】当前未配置可用的 DASHSCOPE_API_KEY（或已设置 MOCK_QWEN）。Netlify 部署：在 Site → Environment variables 中添加密钥后即可启用真实千问；本地可运行仓库里的 qwen-proxy.mjs 并指向 http://127.0.0.1:8787 。" +
      (preview ? "\n\n你刚才输入的预览：\n" + preview : "");

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({
        choices: [{ message: { role: "assistant", content: reply } }],
        object: "chat.completion",
      }),
    };
  }

  try {
    const r = await fetch(OPENAI_COMPAT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      },
      body: JSON.stringify({
        model: body.model || "qwen-turbo",
        messages: body.messages || [],
      }),
    });
    const text = await r.text();
    return {
      statusCode: r.ok ? 200 : r.status,
      headers: cors,
      body: text,
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: cors,
      body: JSON.stringify({ error: String(e.message || e) }),
    };
  }
};
