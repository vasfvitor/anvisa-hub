import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { besideManifest, cargaStat, columnCount, parseManifest, tableStat } from "../src/lib/manifest";

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
  it("gives the oldest ANVISA load date of the card's tables, and says so in words when one has none", () => {
    const m = parseManifest(fixture);
    // alimentos 05/10, produtos 06/10: the oldest, not the latest across the manifest
    expect(cargaStat(m, ["alimentos", "produtos"])).toEqual({ label: "carga da ANVISA", value: "05/10/2026" });
    // a table missing from the build is left to its own stat
    expect(cargaStat(m, ["produtos", "cosmeticos"])).toEqual({ label: "carga da ANVISA", value: "06/10/2026" });
    const semData = { label: "carga da ANVISA: sem data no arquivo", value: "—" };
    expect(cargaStat(m, ["produtos", "empresas"])).toEqual(semData); // empresas has loaded_at null
    expect(cargaStat(m, ["cosmeticos"])).toEqual(semData);
  });
  it("gives a table's rows as a stat, and says so when the table is missing", () => {
    const m = parseManifest(fixture);
    expect(tableStat(m, "produtos", "produtos")).toEqual({ label: "produtos", value: "98.765" });
    expect(tableStat(m, "cosmeticos", "cosmeticos")).toEqual({
      label: "cosmeticos: sem dado neste build",
      value: "—",
    });
  });
  it("counts a table's columns from the manifest, and gives null when it lists none", () => {
    const { alimentos } = base.tables as Record<string, Record<string, unknown>>;
    const cols = Array.from({ length: 104 }, (_, i) => ({ name: `c${String(i)}` }));
    const m = parseManifest({ ...base, tables: { ...base.tables, cmed: { ...alimentos, columns: cols } } });
    expect(columnCount(m, "cmed")).toBe(104);
    expect(columnCount(m, "alimentos")).toBeNull(); // the fixture's empty list
    expect(columnCount(m, "cosmeticos")).toBeNull(); // not in the build
  });
  it("resolves a file beside the manifest", () => {
    expect(besideManifest("https://vasfvitor.github.io/anvisa-api/manifest.json", "dicionario.html")).toBe(
      "https://vasfvitor.github.io/anvisa-api/dicionario.html",
    );
  });
});
