// Checks on the built site (run after `pnpm build`, `pnpm check:dist`): no <script> other than JSON-LD, and none
// of the phrases of frases-proibidas.txt in the text a reader or a search engine gets. test/frases-proibidas.test.ts
// checks the source strings; this reads the output, where a sentence is whole whatever code built it. Exits 1 with
// the list of problems. test/check-dist.test.ts runs it on a fake dist (DIST=<folder>).
//
// An element marked `data-dado` holds the publisher's own text (a subfila or assunto name, a CMED product, a table
// title): it is not checked, since ANVISA's wording ("… sem alteração no material …") is shown as published and must
// not block the site. Its marker goes on the innermost element around the value, so no sentence of ours is skipped.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../", import.meta.url);
const DIST = process.env.DIST || new URL("dist/", ROOT).pathname;

// The same reading of the list as test/frases-proibidas.test.ts: a literal phrase matches with any run of
// whitespace between its words, ignoring case; a "re:" line is used as written; flags "giu".
const PHRASES = readFileSync(new URL("frases-proibidas.txt", ROOT), "utf-8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((l) => ({
    phrase: l,
    re: new RegExp(
      l.startsWith("re:")
        ? l.slice(3)
        : l
            .split(/\s+/)
            .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            .join("\\s+"),
      "giu",
    ),
  }));

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#")
      return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1)));
    return ENTITIES[e.toLowerCase()] ?? m;
  });

/** Every string value of a JSON-LD block (the FAQ answers, the descriptions), not its keys. */
function jsonStrings(v) {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(jsonStrings);
  if (v && typeof v === "object") return Object.values(v).flatMap(jsonStrings);
  return [];
}

/** What a page says: its text, the attributes read aloud or shown (meta content, alt, title, aria-label, placeholder), and its JSON-LD. */
function pageText(html) {
  const parts = [];
  for (const [, body] of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      parts.push(...jsonStrings(JSON.parse(body)));
    } catch {
      parts.push(body);
    }
  }
  for (const [, value] of html.matchAll(/\s(?:content|alt|title|aria-label|placeholder)="([^"]*)"/gi))
    parts.push(value);
  const text = html
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(DADO, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ");
  parts.push(text);
  return decode(parts.join("\n"));
}

/** An element marked as the publisher's data, up to its closing tag (the marked elements hold no element of their own name). */
const DADO = /<([a-z][\w-]*)\b[^>]*\sdata-dado\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(html|txt)$/.test(name)) yield path;
  }
}

const problems = [];
let pages = 0;
for (const file of files(DIST)) {
  pages++;
  const page = relative(DIST, file);
  const raw = readFileSync(file, "utf-8");
  if (file.endsWith(".html")) {
    for (const [, attrs] of raw.matchAll(/<script\b([^>]*)>/gi)) {
      if (!/type="application\/ld\+json"/.test(attrs)) problems.push(`${page}: <script${attrs}> that is not JSON-LD`);
    }
  }
  const text = file.endsWith(".html") ? pageText(raw) : raw;
  for (const { phrase, re } of PHRASES) {
    for (const m of text.matchAll(re)) {
      const around = text
        .slice(Math.max(0, m.index - 40), m.index + m[0].length + 40)
        .replace(/\s+/g, " ")
        .trim();
      problems.push(`${page}: banned phrase "${phrase}": …${around}…`);
    }
  }
}

if (!pages) problems.push(`no .html or .txt file in ${DIST}: run pnpm build first`);
if (problems.length) {
  console.error(problems.slice(0, 50).join("\n"));
  console.error(`${problems.length} problem(s) in ${pages} files`);
  process.exit(1);
}
console.log(`dist ok: ${pages} files, ${PHRASES.length} banned phrases, no client JavaScript`);
