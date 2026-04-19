/**
 * BioStarts 悬浮千问助手
 * - Netlify：默认请求同源的 /.netlify/functions/qwen-proxy（密钥在 Netlify 环境变量）
 * - 本地：可用 window.__QWEN_ASSISTANT__.proxyUrl 或 localStorage 覆盖；亦可运行 qwen-proxy.mjs
 */
(function () {
  const STORAGE_MESSAGES = "qwen-assistant:messages:v1";
  const STORAGE_POS = "qwen-assistant:fab-pos:v1";
  const STORAGE_PROXY = "qwen-assistant:proxy-url:v1";

  const cfg = window.__QWEN_ASSISTANT__ || {};

  function defaultProxyUrl() {
    if (cfg.proxyUrl) return cfg.proxyUrl;
    const h = location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return "http://127.0.0.1:8787";
    return "/.netlify/functions/qwen-proxy";
  }

  const systemPrompt =
    cfg.systemPrompt ||
    "你是 BioStarts 医学统计学习站点的答疑小助手，回答简短清晰，必要时用例子说明。";

  function loadMessages() {
    try {
      const raw = localStorage.getItem(STORAGE_MESSAGES);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveMessages(msgs) {
    localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(msgs.slice(-80)));
  }

  function loadProxyUrl() {
    return localStorage.getItem(STORAGE_PROXY) || defaultProxyUrl();
  }

  function saveProxyUrl(u) {
    localStorage.setItem(STORAGE_PROXY, u.trim());
  }

  function loadPos() {
    try {
      const raw = localStorage.getItem(STORAGE_POS);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (typeof p.left === "number" && typeof p.top === "number") return p;
    } catch {}
    return null;
  }

  function savePos(left, top) {
    localStorage.setItem(STORAGE_POS, JSON.stringify({ left, top }));
  }

  const root = document.createElement("div");
  root.id = "qwen-assistant-root";
  root.innerHTML = `
    <button type="button" class="qa-fab" id="qa-fab" title="通义千问小助手（可拖动）" aria-label="打开千问助手">问</button>
    <div class="qa-panel" id="qa-panel" role="dialog" aria-label="千问对话">
      <div class="qa-panel-header">
        <span>千问 · 小问一句</span>
        <div class="qa-panel-actions">
          <button type="button" id="qa-btn-settings">设置</button>
          <button type="button" id="qa-btn-clear">清空对话</button>
          <button type="button" id="qa-btn-close">关闭</button>
        </div>
      </div>
      <div class="qa-messages" id="qa-messages"></div>
      <div class="qa-settings" id="qa-settings">
        <label>代理地址（Netlify 部署一般保持默认 <code>/.netlify/functions/qwen-proxy</code>；本地可填 <code>http://127.0.0.1:8787</code>）</label>
        <input type="text" id="qa-proxy-input" placeholder="/.netlify/functions/qwen-proxy" />
        <p class="qa-hint">密钥请配置在 Netlify 环境变量 <code>DASHSCOPE_API_KEY</code>，勿写入网页。未配置时接口返回演示文案。</p>
      </div>
      <div class="qa-input-row">
        <textarea id="qa-input" rows="2" placeholder="输入问题，Enter 发送，Shift+Enter 换行"></textarea>
        <button type="button" class="qa-send" id="qa-send">发送</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const fab = root.querySelector("#qa-fab");
  const panel = root.querySelector("#qa-panel");
  const messagesEl = root.querySelector("#qa-messages");
  const input = root.querySelector("#qa-input");
  const sendBtn = root.querySelector("#qa-send");
  const settings = root.querySelector("#qa-settings");
  const proxyInput = root.querySelector("#qa-proxy-input");

  let messages = loadMessages();
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  const p0 = loadPos();
  if (p0) {
    fab.style.left = p0.left + "px";
    fab.style.top = p0.top + "px";
    fab.style.right = "auto";
    fab.style.bottom = "auto";
  }

  function renderMessages() {
    messagesEl.innerHTML = "";
    messages.forEach((m) => {
      const div = document.createElement("div");
      div.className = "qa-msg " + (m.role === "user" ? "user" : "assistant");
      div.textContent = m.content;
      messagesEl.appendChild(div);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  renderMessages();
  proxyInput.value = loadProxyUrl();

  function togglePanel() {
    panel.classList.toggle("qa-open");
  }

  fab.addEventListener("click", (e) => {
    if (!dragging) togglePanel();
  });

  root.querySelector("#qa-btn-close").addEventListener("click", () => {
    panel.classList.remove("qa-open");
  });

  root.querySelector("#qa-btn-clear").addEventListener("click", () => {
    messages = [];
    saveMessages(messages);
    renderMessages();
  });

  root.querySelector("#qa-btn-settings").addEventListener("click", () => {
    settings.classList.toggle("qa-show");
  });

  proxyInput.addEventListener("change", () => {
    saveProxyUrl(proxyInput.value || defaultProxyUrl());
  });

  fab.addEventListener("mousedown", (e) => {
    dragging = false;
    const rect = fab.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    const onMove = (ev) => {
      dragging = true;
      const left = ev.clientX - offsetX;
      const top = ev.clientY - offsetY;
      fab.style.left = Math.max(0, Math.min(left, window.innerWidth - fab.offsetWidth)) + "px";
      fab.style.top = Math.max(0, Math.min(top, window.innerHeight - fab.offsetHeight)) + "px";
      fab.style.right = "auto";
      fab.style.bottom = "auto";
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      savePos(fab.getBoundingClientRect().left + window.scrollX, fab.getBoundingClientRect().top + window.scrollY);
      setTimeout(() => {
        dragging = false;
      }, 0);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  function buildApiMessages() {
    const apiMsgs = [{ role: "system", content: systemPrompt }];
    messages.forEach((m) => {
      if (m.role === "user" || m.role === "assistant") apiMsgs.push({ role: m.role, content: m.content });
    });
    return apiMsgs;
  }

  async function sendChat() {
    const text = (input.value || "").trim();
    if (!text) return;
    input.value = "";
    messages.push({ role: "user", content: text });
    saveMessages(messages);
    renderMessages();
    sendBtn.disabled = true;

    const proxy = (proxyInput.value || "").trim() || loadProxyUrl();
    const url = proxy.startsWith("http") ? proxy : location.origin + (proxy.startsWith("/") ? proxy : "/" + proxy);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen-turbo",
          messages: buildApiMessages(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      const reply =
        data.choices?.[0]?.message?.content ||
        data.error?.message ||
        data.error ||
        (typeof data === "string" ? data : JSON.stringify(data));
      messages.push({ role: "assistant", content: String(reply) });
    } catch (err) {
      messages.push({
        role: "assistant",
        content: "请求失败：" + (err.message || String(err)) + "。请检查代理地址或网络。",
      });
    } finally {
      saveMessages(messages);
      renderMessages();
      sendBtn.disabled = false;
      input.focus();
    }
  }

  sendBtn.addEventListener("click", sendChat);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChat();
    }
  });
})();
