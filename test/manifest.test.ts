import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { besideManifest, latestLoadedAt, parseManifest } from "../src/lib/manifest";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/manifest.json", import.meta.url), "utf-8")) as unknown;
const base = fixture as { tables: Record<string, unknown> };

describe("manifest", () => {
  it("keeps the tables the hub can use", () => {
    const m = parseManifest(fixture);
    expect(Object.keys(m.tables)).toEqual(["alimentos", "produtos", "empresas"]);
    expect(m.tables.produtos?.rows).toBe(98765);
    expect(m.build_id).toBe("20261006T231312Z");
  });
  it("rejects an unknown schema_version", () => {
    expect(() => parseManifest({ ...base, schema_version: 2 })).toThrow(/schema_version 2/);
  });
  it("rejects a manifest without build_id", () => {
    expect(() => parseManifest({ ...base, build_id: undefined })).toThrow(/build_id/);
  });
  it("drops a table it cannot use and keeps the rest", () => {
    const { alimentos } = base.tables as Record<string, Record<string, unknown>>;
    const tables = {
      alimentos,
      'x"; DROP': alimentos,
      no_path: { ...alimentos, path: undefined },
      no_source: { ...alimentos, source: undefined },
      no_rows: { ...alimentos, rows: "1" },
      nula: null,
    };
    expect(Object.keys(parseManifest({ ...base, tables }).tables)).toEqual(["alimentos"]);
  });
  it("finds the most recent loaded_at, ignoring null", () => {
    expect(latestLoadedAt(parseManifest(fixture))).toBe("2026-10-06");
    const only = { ...base, tables: { empresas: base.tables.empresas } };
    expect(latestLoadedAt(parseManifest(only))).toBeNull();
  });
  it("resolves a file beside the manifest", () => {
    expect(besideManifest("https://vasfvitor.github.io/anvisa-api/manifest.json", "dicionario.html")).toBe(
      "https://vasfvitor.github.io/anvisa-api/dicionario.html",
    );
  });
});
