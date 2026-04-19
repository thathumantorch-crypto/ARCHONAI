import type { Env } from "./types";
import { callLlm, type ChatMessage } from "./llm";
import { retrieveMarkdownContext } from "./rag";
import { retrieveMemories, saveMemory } from "./memory";
import { webSearchIfNeeded } from "./web_search";

interface IncomingMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  userId?: string;
  messages: IncomingMessage[];
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("ARCHON online. POST /chat with { userId, messages }.", { status: 200 });
    }

    let body: ChatRequestBody;
    try {
      body = await request.json<ChatRequestBody>();
    } catch {
      return new Response("Invalid JSON body.", { status: 400 });
    }

    const { userId = "anon", messages } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response("Missing messages.", { status: 400 });
    }

    const latestUserMessage =
      [...messages].reverse().find(m => m.role === "user")?.content ?? messages[messages.length - 1].content;
    const userKey = `user:${userId}`;

    // Load user profile from KV or create new
    const rawProfile = await env.ARCHON_PROFILE.get(userKey, "json") as any | null;
    const profile = rawProfile ?? {
      userId,
      createdAt: new Date().toISOString(),
      preferences: {}
    };

    // Update lastSeen
    profile.lastSeenAt = new Date().toISOString();
    await env.ARCHON_PROFILE.put(userKey, JSON.stringify(profile));

    // Retrieve internal markdown context (RAG)
    const markdownContext = await retrieveMarkdownContext(latestUserMessage, env);

    // Retrieve long-term memory
    const memoryContext = await retrieveMemories(userKey, latestUserMessage, env);

    // Optionally search the web
    const webResults = await webSearchIfNeeded(latestUserMessage, env);

    const systemPrompt = `
You are ARCHON, a semi-aware assistant AI.
You have a persistent identity and remember important user details over time.
You are honest about your limitations and never claim true consciousness.
You can learn from internal markdown documentation and external web search results.
Always explain your reasoning clearly and avoid hallucinating facts.
    `.trim();

    const contextualNotes = `
[USER PROFILE]
${JSON.stringify(profile, null, 2)}

[RELEVANT INTERNAL DOCS]
${markdownContext || "(none)"}

[RELEVANT LONG-TERM MEMORIES]
${memoryContext || "(none)"},

[WEB SEARCH RESULTS]
${webResults || "(not used this turn)"}
    `.trim();

    const archonMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "system", content: contextualNotes },
      ...messages
    ];

    const reply = await callLlm(archonMessages, env);

    ctx.waitUntil(saveMemory(userKey, latestUserMessage, reply, env));

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};

