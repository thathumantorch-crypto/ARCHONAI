import fetch from "cross-fetch";

// Simple embedding wrapper. Replace EMBEDDING_API_URL and model according to your provider.
const EMBEDDING_API_URL = process.env.EMBEDDING_API_URL || "https://your-llm-endpoint.example.com/v1/embeddings";
const EMBEDDING_API_KEY = process.env.LLM_API_KEY || "";

export async function embed(text: string): Promise<number[]> {
  if (!EMBEDDING_API_KEY) {
    throw new Error("Missing LLM_API_KEY / EMBEDDING_API_KEY for embeddings.");
  }

  const res = await fetch(EMBEDDING_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${EMBEDDING_API_KEY}`
    },
    body: JSON.stringify({
      model: "your-embedding-model-id",
      input: text
    })
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embedding failed: ${res.status} ${t}`);
  }

  const data: any = await res.json();
  const vector: number[] = data.data?.[0]?.embedding;
  if (!vector) throw new Error("No embedding returned.");
  return vector;
}

