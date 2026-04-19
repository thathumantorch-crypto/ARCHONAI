import fs from "fs";
import path from "path";
import { embed } from "./embed";
import { upsertVectors } from "./vector_db_client";

const DOCS_DIR = path.join(process.cwd(), "data", "docs");

function chunkMarkdown(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    const candidate = current ? `${current}\n\n${p}` : p;
    if (candidate.length > maxChars && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function hash(text: string): string {
  return Buffer.from(text).toString("base64").slice(0, 16);
}

async function main() {
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`Docs directory not found: ${DOCS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith(".md"));
  if (!files.length) {
    console.error("No .md files found in data/docs.");
    process.exit(1);
  }

  for (const file of files) {
    const fullPath = path.join(DOCS_DIR, file);
    const text = fs.readFileSync(fullPath, "utf8");
    const chunks = chunkMarkdown(text, 2000);

    const payloads = [];
    for (const chunk of chunks) {
      const vector = await embed(chunk);
      payloads.push({
        id: `${file}-${hash(chunk)}`,
        vector,
        metadata: { file, text: chunk }
      });
    }

    await upsertVectors(payloads);
    console.log(`Ingested ${file} (${payloads.length} chunks)`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

