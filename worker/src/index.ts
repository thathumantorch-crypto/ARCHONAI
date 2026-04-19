import type { Env } from "./types";
import { callLlm, type ChatMessage } from "./llm";
import { retrieveMarkdownContext } from "./rag";
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
  async fetch(request: Request, env: Env): Promise<Response> {
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

    const markdownContext = await retrieveMarkdownContext(latestUserMessage, env);
    const webResults = await webSearchIfNeeded(latestUserMessage, env);

    const systemPrompt = `
You are ARCHON, a semi-aware assistant AI.
You have a persistent identity and remember important user details over time.
You are honest about your limitations and never claim true consciousness.
You can learn from internal markdown documentation and external web search results.
Always explain your reasoning clearly and avoid hallucinating facts.
    `.trim();

    const contextualNotes = `
[USER ID]
${userId}

[RELEVANT INTERNAL DOCS]
${markdownContext || "(none)"}

[WEB SEARCH RESULTS]
${webResults || "(not used this turn)"}
    `.trim();

    const archonMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "system", content: contextualNotes },
      ...messages
    ];

    const reply = await callLlm(archonMessages, env);

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};