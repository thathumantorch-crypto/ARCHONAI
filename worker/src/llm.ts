import type { Env } from "./types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function callLlm(messages: ChatMessage[], env: Env): Promise<string> {
  const inferenceUrl = env.INFERENCE_URL ?? "";
  if (!inferenceUrl) {
    return "ARCHON: No inference endpoint configured.";
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

    const text = await res.text();
    
    if (!res.ok) {
      return `ARCHON error: ${res.status} ${res.statusText} - ${text.substring(0, 100)}`;
    }
    
    if (!text || text.trim() === "") {
      return "ARCHON: Empty response from inference.";
    }
    
    try {
      const data = JSON.parse(text);
      return data.output || "ARCHON: No response generated.";
    } catch (parseErr) {
      return `ARCHON parse error: ${text.substring(0, 100)}`;
    }
  } catch (err) {
    return `ARCHON connection failed: ${err}`;
  }
}

