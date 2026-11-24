// The phrases of frases-proibidas.txt must not appear in the strings and template text under src/.
// Comments are blanked first (keeping line numbers): they are not public text.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);
const EXTENSIONS = /\.(astro|vue|ts|mjs)$/;

/** One RegExp per line of the list; a literal phrase matches across a line break too. */
function loadPhrases(text: string): { phrase: string; re: RegExp }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) =>
      l.startsWith("re:")
        ? { phrase: l, re: new RegExp(l.slice(3), "giu") }
        : { phrase: l, re: new RegExp(l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+"), "giu") },
    );
}

/** Blanks block, HTML and line comments, keeping every newline so line numbers stay right. */
function stripComments(src: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  return src
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, before: string) => before + blank(m.slice(before.length)));
}

function findPhrases(file: string, src: string, phrases: { phrase: string; re: RegExp }[]): string[] {
  const text = stripComments(src);
  const hits: string[] = [];
  for (const { phrase, re } of phrases) {
    for (const m of text.matchAll(re)) {
      const line = text.slice(0, m.index).split("\n").length;
      hits.push(`${file}:${line}: ${phrase}`);
    }
  }
  return hits;
}

describe("frases proibidas", () => {
  const phrases = loadPhrases(readFileSync(new URL("frases-proibidas.txt", root), "utf-8"));

  it("finds a phrase in text and ignores it in comments", () => {
    const src = 'const a = "Dados sem\n  alteração";\n// sem alteração\n/* nada substitui */\n<!-- saiba mais -->';
    expect(findPhrases("x.astro", src, phrases)).toEqual(["x.astro:1: sem alteração"]);
    expect(findPhrases("x.ts", 'const u = "https://x.y/"; // Sem conta, sem rastreamento', phrases)).toEqual([]);
    expect(findPhrases("x.ts", 'const s = "Sem conta, sem rastreamento.";', phrases)).toEqual([
      "x.ts:1: re:\\bsem [^\\s,]+, sem [^\\s,]+",
    ]);
  });

  it("are absent from src/", () => {
    const files = (readdirSync(new URL("src/", root), { recursive: true }) as string[])
      .filter((f) => EXTENSIONS.test(f))
      .sort();
    expect(files.length).toBeGreaterThan(0);
    const hits = files.flatMap((f) =>
      findPhrases(`src/${f}`, readFileSync(new URL(`src/${f}`, root), "utf-8"), phrases),
    );
    expect(hits).toEqual([]);
  });
});
