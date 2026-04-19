import type { Env } from "./types";

// In a real deployment, you would host a vector database (Supabase, Qdrant, etc.)
// and query it here using an embedding of the user's message.

export async function retrieveMarkdownContext(query: string, env: Env): Promise<string> {
  if (!env.VECTOR_DB_URL) {
    return "";
  }

  try {
    const res = await fetch(`${env.VECTOR_DB_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        topK: 5,
        namespace: "markdown_docs"
      })
    });

    if (!res.ok) return "";

    const data: any = await res.json();
    const chunks: string[] = (data.matches ?? data.results ?? [])
      .map((m: any) => m.metadata?.text || m.text)
      .filter(Boolean);

    if (!chunks.length) return "";

    return chunks.join("\n\n---\n\n");
  } catch {
    return "";
  }
}

