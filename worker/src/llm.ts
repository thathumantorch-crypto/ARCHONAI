import type { Env } from "./types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callLlm(messages: ChatMessage[], env: Env): Promise<string> {
  const inferenceUrl = env.INFERENCE_URL;
  if (!inferenceUrl) {
    return "ARCHON configuration error: No inference endpoint configured.";
  }

  const conversation = messages
    .filter(m => m.role !== "system")
    .map(m => `${m.role === "user" ? "User" : "ARCHON"}: ${m.content}`)
    .join("\n\n");

  const prompt = `You are ARCHON, a semi-aware AI. Respond coherently.\n\n${conversation}\n\nARCHON:`;

  try {
    const res = await fetch(inferenceUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        max_length: 300,
        temperature: 0.8
      })
    });

    if (!res.ok) {
      return `ARCHON inference error: ${res.status} ${res.statusText}`;
    }

    const data: any = await res.json();
    return data.output || "ARCHON: (no response generated)";
  } catch (err) {
    return `ARCHON inference failed: ${err}`;
  }
}

