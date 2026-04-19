import type { Env } from "./types";

export async function retrieveMemories(userKey: string, query: string, env: Env): Promise<string> {
  // For simplicity, just store and retrieve a rolling summary blob per user.
  const summary = await env.ARCHON_MEMORY.get(userKey);
  return summary || "";
}

export async function saveMemory(userKey: string, userMessage: string, archonReply: string, env: Env): Promise<void> {
  const prev = (await env.ARCHON_MEMORY.get(userKey)) || "";
  const appended = `${prev}\n\n[EXCHANGE]\nUser: ${userMessage}\nARCHON: ${archonReply}\n`;
  await env.ARCHON_MEMORY.put(userKey, appended.slice(-5000)); // keep last ~5k chars
}

