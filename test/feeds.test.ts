import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  coletaParada,
  comparacaoFila,
  comparacaoNovidades,
  fetchFeedsMeta,
  parseFeedsMeta,
  stampToDate,
  statNaFila,
} from "../src/lib/feeds";
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
  it("reads the base collection of the day's entries and exits, optional, and rejects a bad one", () => {
    const f = fixture as Record<string, unknown> & { novidades: Record<string, unknown> };
    const comBase = (base: unknown) => ({ ...f, novidades: { ...f.novidades, base } });
    expect(parseFeedsMeta(fixture).novidades?.base).toBe("2026-10-07");
    expect(parseFeedsMeta(comBase(undefined)).novidades?.base).toBeUndefined();
    expect(() => parseFeedsMeta(comBase(20261007))).toThrow(/bad novidades/);
    expect(() => parseFeedsMeta(comBase("07/10/2026"))).toThrow(/bad novidades/);
    expect(() => parseFeedsMeta(comBase("2026-10-08"))).toThrow(/bad novidades/); // not before the day
  });
  it("says which collection the entries and exits are compared against, and a gap of more than a day", () => {
    expect(comparacaoNovidades({ dia: "2026-10-08", base: "2026-10-07" })).toBe(
      "Entradas e saídas contra a coleta de 07/10/2026.",
    );
    expect(comparacaoNovidades({ dia: "2026-11-23", base: "2026-11-20" })).toBe(
      "Entradas e saídas contra a coleta de 20/11/2026: a comparação cobre 3 dias.",
    );
    // across the end of a month
    expect(comparacaoNovidades({ dia: "2026-03-02", base: "2026-02-27" })).toMatch(/cobre 3 dias/);
    expect(comparacaoNovidades({ dia: "2026-10-08" })).toBeNull(); // older files: the home keeps its wording
  });
  it("reads a subfila's own base collection, optional, and names it only when it differs from the day's", () => {
    const m = parseFeedsMeta(fixture);
    const [primeira, segunda] = m.novidades!.filas;
    expect(primeira?.base).toBeUndefined();
    expect(segunda?.base).toBe("2026-10-05");
    expect(comparacaoFila(primeira!, m.novidades!)).toBeNull(); // absent: the day's sentence covers it
    expect(comparacaoFila({ base: "2026-10-07" }, m.novidades!)).toBeNull(); // the same collection
    expect(comparacaoFila(segunda!, m.novidades!)).toBe("contra a coleta de 05/10/2026");
    expect(comparacaoFila(segunda!, {})).toBe("contra a coleta de 05/10/2026"); // the day names none
    const f = fixture as Record<string, unknown> & { novidades: { filas: Record<string, unknown>[] } };
    const comBase = (base: unknown) => ({
      ...f,
      novidades: { ...f.novidades, filas: [{ ...f.novidades.filas[0], base }] },
    });
    expect(() => parseFeedsMeta(comBase("05/10/2026"))).toThrow(/bad novidades filas/);
    expect(() => parseFeedsMeta(comBase("2026-10-08"))).toThrow(/bad novidades filas/); // not before the day
  });
  it("says a crawl that read no subfila in words, not as 0 na fila", () => {
    const m = parseFeedsMeta(fixture);
    expect(statNaFila(m)).toEqual({ label: "na fila", value: fmtInt(m.rows) });
    expect(statNaFila(parseFeedsMeta({ ...(fixture as object), subfilas_crawled: 300 }))?.label).toBe(
      "na fila, em 300 filas coletadas",
    );
    expect(statNaFila(parseFeedsMeta({ ...(fixture as object), subfilas_crawled: 0, rows: 0 }))).toBeNull();
  });
  it("names a crawl that stopped more than 36 h before the build, and stays quiet before that", () => {
    const m = { finished: "2026-10-08T13:11:43-03:00" };
    expect(coletaParada(m, new Date("2026-10-09T13:11:43-03:00"))).toBeNull(); // 24 h
    expect(coletaParada(m, new Date("2026-10-09T23:00:00-03:00"))).toBeNull(); // under 36 h
    expect(coletaParada(m, new Date("2026-10-10T02:00:00-03:00"))).toBe(
      "A coleta das filas está parada: a última terminou em 08/10/2026, 13:11.",
    );
  });
  it("reads the contract version when anvisa-feeds publishes it, and fails on one it does not know", () => {
    expect(parseFeedsMeta(fixture).date).toBe("2026-10-08"); // the fixture predates the key
    expect(parseFeedsMeta({ ...(fixture as object), schema_version: 1 }).date).toBe("2026-10-08");
    expect(() => parseFeedsMeta({ ...(fixture as object), schema_version: 2 })).toThrow(/schema_version 2/);
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
