// scripts/check-dist.mjs reads the built site: run here on a fake dist folder.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = join(import.meta.dirname, "..", "scripts", "check-dist.mjs");

function rodar(files: Record<string, string>): { status: number | null; saida: string } {
  const dist = mkdtempSync(join(tmpdir(), "dist-"));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(dist, path, ".."), { recursive: true });
    writeFileSync(join(dist, path), body);
  }
  const r = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8", env: { ...process.env, DIST: dist } });
  return { status: r.status, saida: r.stdout + r.stderr };
}

const page = (head: string, body: string) => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;
const LD = '<script type="application/ld+json">{"@type":"Thing","name":"x"}</script>';

describe("check-dist", () => {
  it("passes a page with JSON-LD and clean text", () => {
    const r = rodar({ "index.html": page(LD, "<p>Coleta de 25/11/2026.</p>"), "llms.txt": "# x\n" });
    expect(r.status, r.saida).toBe(0);
    expect(r.saida).toContain("dist ok: 2 files");
  });

  it("finds a phrase split by tags, entities and line breaks, in text, meta content and JSON-LD", () => {
    const r = rodar({
      "a/index.html": page("", "<p>Saiba\n  <a href='/x/'>mais</a></p>"),
      "b/index.html": page('<meta name="description" content="Lista&nbsp;atual de preços">', ""),
      "c/index.html": page('<script type="application/ld+json">{"text":"Atualizado hoje."}</script>', ""),
      "llms.txt": "Arquivos republicados diariamente.",
    });
    expect(r.status).toBe(1);
    expect(r.saida).toContain('a/index.html: banned phrase "saiba mais"');
    expect(r.saida).toContain('b/index.html: banned phrase "lista atual"');
    expect(r.saida).toContain(String.raw`c/index.html: banned phrase "re:\bhoje\b"`);
    expect(r.saida).toContain('llms.txt: banned phrase "republicados diariamente"');
  });

  it("skips the publisher's text in an element marked data-dado, and only there", () => {
    const nome = "Seringa descartável sem alteração no material";
    const marcado = rodar({
      "index.html": page(
        "",
        `<li><a href="/f/1/" data-dado>${nome}</a> <small><span data-dado>Área</span></small></li>`,
      ),
    });
    expect(marcado.status, marcado.saida).toBe(0);
    const solto = rodar({ "index.html": page("", `<li><a href="/f/1/">${nome}</a></li>`) });
    expect(solto.status).toBe(1);
    expect(solto.saida).toContain('index.html: banned phrase "sem alteração"');
    // our sentence next to a marked value is still read
    const vizinho = rodar({ "index.html": page("", `<p><span data-dado>${nome}</span>, lista atual</p>`) });
    expect(vizinho.saida).toContain('index.html: banned phrase "lista atual"');
  });

  it("ignores class names, styles and comments", () => {
    const r = rodar({
      "index.html": page("<style>.hoje{color:red}</style>", '<section class="hoje"><!-- saiba mais --></section>'),
    });
    expect(r.status, r.saida).toBe(0);
  });

  it("fails on a script that is not JSON-LD", () => {
    const r = rodar({ "index.html": page(`${LD}<script type="module" src="/_astro/x.js"></script>`, "") });
    expect(r.status).toBe(1);
    expect(r.saida).toContain('index.html: <script type="module" src="/_astro/x.js"> that is not JSON-LD');
  });
});
