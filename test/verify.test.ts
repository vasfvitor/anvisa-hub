// scripts/verify.sh decides whether a scheduled run of pages.yml publishes. Run here with a fake curl that
// answers each of the three URLs from an environment variable (empty: the URL fails, as curl -f does).
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PARADA_HORAS } from "../src/lib/feeds";

const SCRIPT = join(import.meta.dirname, "..", "scripts", "verify.sh");

const FAKE_CURL = `#!/usr/bin/env bash
url="\${*: -1}"
case "$url" in
  https://m.test/*) body="$FAKE_MANIFEST" ;;
  https://f.test/*) body="$FAKE_FEEDS" ;;
  https://s.test/*) body="$FAKE_SITE" ;;
esac
[ -n "$body" ] || exit 22
printf '%s' "$body"
`;

// 2026-11-25T12:00:00Z
const NOW = Date.UTC(2026, 10, 25, 12) / 1000;
const horasAntes = (h: number): string => new Date((NOW - h * 3600) * 1000).toISOString().replace("Z", "+00:00");

interface Fontes {
  event?: string;
  manifest?: unknown;
  feeds?: unknown;
  site?: unknown;
}

function rodar({ event = "schedule", manifest, feeds, site }: Fontes): { changed: string; saida: string } {
  const dir = mkdtempSync(join(tmpdir(), "verify-"));
  writeFileSync(join(dir, "curl"), FAKE_CURL);
  chmodSync(join(dir, "curl"), 0o755);
  const output = join(dir, "output");
  writeFileSync(output, "");
  const json = (v: unknown) => (v === undefined ? "" : JSON.stringify(v));
  const r = spawnSync("bash", [SCRIPT], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH ?? ""}`,
      GITHUB_OUTPUT: output,
      EVENT: event,
      NOW: String(NOW),
      MANIFEST: "https://m.test/manifest.json",
      FEEDS_META: "https://f.test/meta.json",
      PUBLISHED: "https://s.test/build.json",
      FAKE_MANIFEST: json(manifest),
      FAKE_FEEDS: json(feeds),
      FAKE_SITE: json(site),
    },
  });
  expect(r.status, r.stderr).toBe(0);
  const changed = /changed=(\w+)/.exec(readFileSync(output, "utf8"))?.[1] ?? "";
  return { changed, saida: r.stdout + r.stderr };
}

const manifest = { build_id: "B1" };
const emDia = { date: "2026-11-25", finished: horasAntes(3) };
const parada = { date: "2026-11-23", finished: horasAntes(PARADA_HORAS + 1) };
const site = (feeds: { date: string }, coleta_parada?: boolean | null) => ({
  anvisa_build_id: "B1",
  feeds_date: feeds.date,
  ...(coleta_parada === undefined ? {} : { coleta_parada }),
});

describe("verify.sh", () => {
  it("holds the same stopped-crawl threshold as src/lib/feeds.ts", () => {
    expect(readFileSync(SCRIPT, "utf8")).toMatch(new RegExp(`^PARADA_HORAS=${String(PARADA_HORAS)}$`, "m"));
  });

  it("always publishes on push and manual dispatch", () => {
    expect(rodar({ event: "push" }).changed).toBe("true");
    expect(rodar({ event: "workflow_dispatch" }).changed).toBe("true");
  });

  it("does not publish when nothing moved and the crawl runs", () => {
    const r = rodar({ manifest, feeds: emDia, site: site(emDia, false) });
    expect(r.changed).toBe("false");
    expect(r.saida).toContain("unchanged");
  });

  it("publishes when the build_id or the feeds date moved", () => {
    expect(rodar({ manifest: { build_id: "B2" }, feeds: emDia, site: site(emDia, false) }).changed).toBe("true");
    expect(rodar({ manifest, feeds: emDia, site: site({ date: "2026-11-24" }, false) }).changed).toBe("true");
  });

  it("publishes once when the crawl has stopped since the last build, so the home says so", () => {
    const r = rodar({ manifest, feeds: parada, site: site(parada, false) });
    expect(r.changed).toBe("true");
    expect(r.saida).toContain("crawl stopped");
    // a /build.json from before the field
    expect(rodar({ manifest, feeds: parada, site: site(parada) }).changed).toBe("true");
    // the published build already says it
    expect(rodar({ manifest, feeds: parada, site: site(parada, true) }).changed).toBe("false");
  });

  it("does not count a crawl as stopped before the threshold", () => {
    const quase = { date: "2026-11-24", finished: horasAntes(PARADA_HORAS - 1) };
    expect(rodar({ manifest, feeds: quase, site: site(quase, false) }).changed).toBe("false");
  });

  it("skips with a warning when a source cannot be read", () => {
    const r = rodar({ feeds: emDia, site: site(emDia, false) });
    expect(r.changed).toBe("false");
    expect(r.saida).toContain(
      "::warning::could not read the build_id of the anvisa-api manifest; not publishing, the site keeps its current build",
    );
    const semFeeds = rodar({ manifest, site: site(emDia, false) });
    expect(semFeeds.changed).toBe("false");
    expect(semFeeds.saida).toContain("could not read the date of the anvisa-feeds meta.json");
  });

  it("publishes when the site's own /build.json cannot be read", () => {
    expect(rodar({ manifest, feeds: emDia }).changed).toBe("true");
  });
});
