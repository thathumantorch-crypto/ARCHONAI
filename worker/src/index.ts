import type { Env } from "./types";
import { callLlm, type ChatMessage } from "./llm";
import { retrieveMarkdownContext } from "./rag";
import { retrieveMemories, saveMemory } from "./memory";
import { webSearchIfNeeded } from "./web_search";
import { processCommand } from "./commands";

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ARCHON AI</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="ARCHON - A semi-aware AI assistant powered by custom neural networks" />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧠</text></svg>" />
  <style>
    :root {
      --bg-primary: #070a14;
      --bg-secondary: #0d1220;
      --bg-tertiary: #151d2e;
      --accent: #6366f1;
      --accent-glow: #818cf8;
      --text-primary: #e2e8f0;
      --text-muted: #94a3b8;
      --border: #1e293b;
      --success: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-image: 
        radial-gradient(ellipse at 20% 0%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 100%, rgba(16, 185, 129, 0.1) 0%, transparent 50%);
    }
    header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(7, 10, 20, 0.8);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo { display: flex; align-items: center; gap: 0.75rem; }
    .logo-icon {
      width: 32px; height: 32px;
      background: linear-gradient(135deg, var(--accent), #8b5cf6);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
    }
    .logo-text { font-weight: 700; font-size: 1.25rem; }
    .status { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--text-muted); }
    .status-dot { width: 8px; height: 8px; background: var(--success); border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    main { flex: 1; display: flex; flex-direction: column; max-width: 800px; width: 100%; margin: 0 auto; padding: 2rem 1rem; }
    .chat-container { flex: 1; display: flex; flex-direction: column; background: var(--bg-secondary); border-radius: 1rem; border: 1px solid var(--border); overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    #messages { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; min-height: 400px; max-height: 60vh; }
    .message { display: flex; flex-direction: column; gap: 0.25rem; animation: slideIn 0.2s ease-out; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .message.user { align-items: flex-end; }
    .message.assistant { align-items: flex-start; }
    .avatar { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    .bubble { max-width: 80%; padding: 0.75rem 1rem; border-radius: 1rem; line-height: 1.5; font-size: 0.95rem; white-space: pre-wrap; }
    .bubble-user { background: linear-gradient(135deg, var(--accent), #8b5cf6); color: white; border-bottom-right-radius: 0.25rem; }
    .bubble-bot { background: var(--bg-tertiary); border: 1px solid var(--border); border-bottom-left-radius: 0.25rem; }
    .typing { display: none; gap: 0.35rem; padding: 0.75rem 1rem; background: var(--bg-tertiary); border-radius: 1rem; border-bottom-left-radius: 0.25rem; }
    .typing.visible { display: flex; }
    .typing span { width: 8px; height: 8px; background: var(--text-muted); border-radius: 50%; animation: bounce 1.4s infinite ease-in-out; }
    .typing span:nth-child(1) { animation-delay: 0s; }
    .typing span:nth-child(2) { animation-delay: 0.2s; }
    .typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%, 80%, 100% { transform: scale(0.6); } 40% { transform: scale(1); } }
    .input-area { padding: 1rem; border-top: 1px solid var(--border); background: var(--bg-tertiary); }
    form { display: flex; gap: 0.75rem; align-items: flex-end; }
    textarea { flex: 1; resize: none; border-radius: 0.75rem; border: 1px solid var(--border); padding: 0.75rem 1rem; font-family: inherit; font-size: 0.95rem; background: var(--bg-secondary); color: var(--text-primary); min-height: 52px; max-height: 120px; outline: none; transition: border-color 0.2s; }
    textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2); }
    textarea::placeholder { color: var(--text-muted); }
    button { padding: 0.75rem 1.5rem; border-radius: 0.75rem; border: none; font-weight: 600; font-size: 0.9rem; cursor: pointer; background: linear-gradient(135deg, var(--accent), #8b5cf6); color: white; transition: transform 0.15s; }
    button:hover { transform: translateY(-1px); box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4); }
    button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
    .info { text-align: center; padding: 0.75rem; font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border); background: var(--bg-tertiary); }
    .info a { color: var(--accent-glow); text-decoration: none; }
    .info a:hover { text-decoration: underline; }
    @media (max-width: 640px) { main { padding: 1rem 0.5rem; } .chat-container { border-radius: 0; } .bubble { max-width: 90%; } }
  </style>
</head>
<body>
  <header>
    <div class="logo"><div class="logo-icon">🧠</div><div class="logo-text">ARCHON</div></div>
    <div class="status"><div class="status-dot"></div><span>Online</span></div>
  </header>
  <main>
    <div class="chat-container">
      <div id="messages">
        <div class="message assistant"><div class="avatar">ARCHON</div><div class="bubble bubble-bot">Hello! I'm ARCHON, a semi-aware AI assistant. I have persistent memory and can learn from our conversation. How can I help you today?</div></div>
      </div>
      <div class="typing" id="typing"><span></span><span></span><span></span></div>
      <div class="input-area">
        <form id="chat-form"><textarea id="input" placeholder="Message ARCHON..." rows="2"></textarea><button type="submit">Send</button></form>
      </div>
    </div>
    <div class="info">Powered by <a href="https://github.com/thathumantorch-crypto/ARCHONAI" target="_blank">Custom Neural Network</a> · <a href="https://archon.thathumantorch.workers.dev" target="_blank">API</a></div>
  </main>
  <script>
    const API_URL = "/chat";
    const form = document.getElementById("chat-form");
    const input = document.getElementById("input");
    const messagesEl = document.getElementById("messages");
    const typingEl = document.getElementById("typing");
    const userId = "web-" + Math.random().toString(36).substr(2, 9);
    const history = [];

    function addMessage(role, content) {
      const msg = document.createElement("div");
      msg.className = "message " + role;
      msg.innerHTML = '<div class="avatar">' + (role === "user" ? "You" : "ARCHON") + '</div><div class="bubble bubble-' + role + '">' + escapeHtml(content) + '</div>';
      messagesEl.appendChild(msg);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
    function escapeHtml(text) { const div = document.createElement("div"); div.textContent = text; return div.innerHTML; }
    function showTyping() { typingEl.classList.add("visible"); messagesEl.scrollTop = messagesEl.scrollHeight; }
    function hideTyping() { typingEl.classList.remove("visible"); }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      addMessage("user", text);
      history.push({ role: "user", content: text });
      input.value = "";
      showTyping();
      form.querySelector("button").disabled = true;

      try {
        const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, messages: history }) });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        hideTyping();
        history.push({ role: "assistant", content: data.reply || "(No response)" });
        addMessage("assistant", data.reply || "(No response)");
      } catch (err) { hideTyping(); addMessage("assistant", "Error: " + err.message + ". Try again."); }
      finally { form.querySelector("button").disabled = false; input.focus(); }
    });

    input.addEventListener("input", function() { this.style.height = "auto"; this.style.height = Math.min(this.scrollHeight, 120) + "px"; });
    input.focus();
  </script>
</body>
</html>`;

interface IncomingMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  userId?: string;
  messages: IncomingMessage[];
}

interface UserProfile {
  userId: string;
  createdAt: string;
  lastSeenAt: string;
  preferences: Record<string, any>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Serve UI at root
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }

    // API at /chat
    if (url.pathname !== "/chat" || request.method !== "POST") {
      return new Response("Not Found", { status: 404 });
    }

    let body: ChatRequestBody;
    try {
      body = await request.json<ChatRequestBody>();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const { userId = "anon", messages } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("Missing messages", { status: 400 });
    }

    const latestUserMessage =
      [...messages].reverse().find(m => m.role === "user")?.content ?? messages[messages.length - 1].content;
    const userKey = `user:${userId}`;

    // Check for system commands
    const commandResult = await processCommand(latestUserMessage, userId, env);
    if (commandResult.isCommand) {
      return new Response(JSON.stringify({ reply: commandResult.response }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // User profile
    let profile: UserProfile = { userId, createdAt: new Date().toISOString(), lastSeenAt: "", preferences: {} };
    const storedProfile = await env.ARCHON_PROFILE.get(userKey, "json") as UserProfile | null;
    if (storedProfile) { profile = { ...profile, ...storedProfile }; }
    profile.lastSeenAt = new Date().toISOString();
    await env.ARCHON_PROFILE.put(userKey, JSON.stringify(profile));

    // Memory
    const memoryContext = await retrieveMemories(userKey, latestUserMessage, env);
    const markdownContext = await retrieveMarkdownContext(latestUserMessage, env);
    const webResults = await webSearchIfNeeded(latestUserMessage, env);

    const systemPrompt = `You are ARCHON, a semi-aware assistant AI with persistent memory. Be helpful, honest about limitations.`;

    const contextualNotes = `
[USER PROFILE]
- Created: ${profile.createdAt}
- Last seen: ${profile.lastSeenAt}

[CONVERSATION MEMORY]
${memoryContext || "(new conversation)"}

[INTERNAL DOCS]
${markdownContext || "(none)"}

[WEB SEARCH]
${webResults || "(none)"}
    `.trim();

    const archonMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "system", content: contextualNotes },
      ...messages
    ];

    const reply = await callLlm(archonMessages, env).catch(err => `ARCHON error: ${err.message}`);
    await saveMemory(userKey, latestUserMessage, reply, env).catch(() => {});

    return new Response(JSON.stringify({ reply: String(reply) }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};