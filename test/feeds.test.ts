import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFeedsMeta, parseFeedsMeta, stampToDate, statNaFila } from "../src/lib/feeds";
import { fmtInt } from "../src/lib/format";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/meta.json", import.meta.url), "utf-8")) as unknown;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("feeds meta", () => {
  it("parses the file the feeds build writes", () => {
    const m = parseFeedsMeta(fixture);
    expect(m.date).toBe("2026-10-08");
    expect(m.subfilas_total).toBe(319);
    expect(m.catalog?.areas).toBe(11);
  });
  it("reads the CMED block when present and rejects a broken one", () => {
    const m = parseFeedsMeta(fixture);
    expect(m.cmed?.stamp).toBe("20261009");
    expect(stampToDate(m.cmed!.stamp)).toBe("2026-10-09");
    const without = { ...(fixture as object), cmed: undefined };
    expect(parseFeedsMeta(without).cmed).toBeUndefined();
    expect(() => parseFeedsMeta({ ...(fixture as object), cmed: { stamp: "x" } })).toThrow(/cmed without rows/);
  });
  it("flags a partial crawl, whose rows count only the subfilas that answered", () => {
    expect(parseFeedsMeta(fixture).parcial).toBe(false); // 319 of 319
    const parcial = parseFeedsMeta({ ...(fixture as object), subfilas_crawled: 300 });
    expect(parcial.parcial).toBe(true);
    expect(parcial.subfilas_crawled).toBe(300);
  });
  it("checks the CMED and novidades blocks as deep as the home reads them", () => {
    const f = fixture as Record<string, unknown> & {
      cmed: Record<string, unknown>;
      novidades: Record<string, unknown>;
    };
    const comCmed = (c: Record<string, unknown>) => ({ ...f, cmed: { ...f.cmed, ...c } });
    const comNovidades = (n: Record<string, unknown>) => ({ ...f, novidades: { ...f.novidades, ...n } });
    expect(() => parseFeedsMeta(comCmed({ months: undefined }))).toThrow(/cmed without months/);
    expect(() => parseFeedsMeta(comCmed({ events: { entered: 1, changed: 2 } }))).toThrow(/cmed without events/);
    expect(() => parseFeedsMeta(comCmed({ destaques: { altas: [], baixas: [] } }))).toThrow(/destaques entradas/);
    expect(() =>
      parseFeedsMeta(comCmed({ destaques: { altas: [{ produto: 1 }], baixas: [], entradas: [], saidas: [] } })),
    ).toThrow(/destaques altas/);
    expect(parseFeedsMeta(comCmed({ destaques: undefined })).cmed?.destaques).toBeUndefined();
    expect(() => parseFeedsMeta(comNovidades({ filas: "x" }))).toThrow(/novidades filas/);
    expect(() => parseFeedsMeta(comNovidades({ filas: [{ nome: "x" }] }))).toThrow(/novidades filas/);
    expect(() => parseFeedsMeta(comNovidades({ sairam: undefined }))).toThrow(/bad novidades/);
    expect(parseFeedsMeta({ ...f, novidades: undefined }).novidades).toBeUndefined();
  });
  it("says a crawl that read no subfila in words, not as 0 na fila", () => {
    const m = parseFeedsMeta(fixture);
    expect(statNaFila(m)).toEqual({ label: "na fila", value: fmtInt(m.rows) });
    expect(statNaFila(parseFeedsMeta({ ...(fixture as object), subfilas_crawled: 300 }))?.label).toBe(
      "na fila, em 300 filas coletadas",
    );
    expect(statNaFila(parseFeedsMeta({ ...(fixture as object), subfilas_crawled: 0, rows: 0 }))).toBeNull();
  });
  it("rejects a file without the counts", () => {
    expect(() => parseFeedsMeta({ date: "2026-10-08", finished: "x" })).toThrow(/rows/);
    expect(() => parseFeedsMeta(null)).toThrow(/object/);
  });
  it("is null on 404 and on a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));
    expect(await fetchFeedsMeta("https://x.test/meta.json")).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    expect(await fetchFeedsMeta("https://x.test/meta.json")).toBeNull();
  });
  it("throws when the file exists but does not parse", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ date: "2026-10-08" })));
    await expect(fetchFeedsMeta("https://x.test/meta.json")).rejects.toThrow(/feeds meta/);
  });
  it("gets past the Pages cache with ?t=", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json(fixture));
    vi.stubGlobal("fetch", fetchMock);
    await fetchFeedsMeta("https://x.test/meta.json");
    const [url] = fetchMock.mock.calls[0] as [URL];
    expect(url.searchParams.has("t")).toBe(true);
  });
});
