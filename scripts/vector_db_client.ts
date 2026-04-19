import fetch from "cross-fetch";

const VECTOR_DB_URL = process.env.VECTOR_DB_URL || "https://your-vector-db.example.com";

interface VectorPayload {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
}

export async function upsertVectors(payloads: VectorPayload[]): Promise<void> {
  const res = await fetch(`${VECTOR_DB_URL}/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vectors: payloads, namespace: "markdown_docs" })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vector DB upsert failed: ${res.status} ${text}`);
  }
}

