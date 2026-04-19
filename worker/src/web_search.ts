import type { Env } from "./types";

export async function webSearchIfNeeded(query: string, env: Env): Promise<string> {
  const pattern = /\b(202[4-9]|latest|news|today|current|update|recent)\b/i;
  const needsWeb = pattern.test(query);
  if (!needsWeb || !env.SEARCH_API_KEY) return "";

  try {
    const res = await fetch("https://your-search-endpoint.example.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.SEARCH_API_KEY}`
      },
      body: JSON.stringify({
        query,
        numResults: 5
      })
    });

    if (!res.ok) return "";

    const data: any = await res.json();
    const results: any[] = data.results ?? data;

    return results
      .slice(0, 5)
      .map((r: any, i: number) => `(${i + 1}) ${r.title} - ${r.url}\n${r.snippet || ""}`)
      .join("\n\n");
  } catch {
    return "";
  }
}

