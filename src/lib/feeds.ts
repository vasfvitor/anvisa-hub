// Contract with `anvisa-feeds`: its build writes `meta.json` at the site root, the latest crawl's meta
// (same keys as snapshots/<day>.meta.json) plus totals. The file is newer than the hub's first deploy,
// so a missing file is tolerated: the feeds card then shows the link without numbers.
import { fmtInt } from "./format";

export interface FeedsMeta {
  /** crawl day, YYYY-MM-DD */
  date: string;
  /** end of the crawl, ISO 8601 with offset */
  finished: string;
  /** processes queued across every subfila on that day */
  rows: number;
  subfilas_total: number;
  subfilas_crawled: number;
  /** derived here: fewer subfilas answered than exist, so `rows` is not the whole queue */
  parcial: boolean;
  /** subfilas with a feed */
  feeds?: number;
  first_snapshot?: string;
  catalog?: { areas: number; grupos: number; subfilas: number };
  base_url?: string;
  /** the CMED price-list pages, once the feeds site has a monthly snapshot */
  cmed?: CmedMeta;
  /** the day's busiest subfilas */
  novidades?: Novidades;
}

export interface Mover {
  subfila: number;
  nome: string;
  grupo: string;
  area: string;
  entraram: number;
  sairam: number;
  /** processes queued today */
  fila: number;
  pagina: string;
}

export interface Novidades {
  dia: string;
  filas_com_movimento: number;
  entraram: number;
  sairam: number;
  /** up to ten, busiest first */
  filas: Mover[];
}

export interface Highlight {
  produto: string | null;
  apresentacao: string | null;
  substancia: string;
  laboratorio: string | null;
  /** PF at ICMS 0 %, centavos; null when the presentation was not on that list */
  pf_de: number | null;
  pf_para: number | null;
  /** percent, one decimal; null for entries and exits */
  variacao: number | null;
  pagina: string | null;
}

export interface CmedMeta {
  /** the month's stamp, YYYYMMDD (the files' Last-Modified day) */
  stamp: string;
  /** dd/mm/yyyy HH:MM:SS, Brasília */
  publicado_em: string;
  /** when the files were read, ISO 8601 with offset */
  fetched: string;
  /** presentations on the list */
  rows: number;
  substancias: number;
  laboratorios: number;
  feeds: number;
  months: number;
  events: { entered: number; changed: number; left: number };
  destaques?: { altas: Highlight[]; baixas: Highlight[]; entradas: Highlight[]; saidas: Highlight[] };
}

export function parseFeedsMeta(raw: unknown): FeedsMeta {
  const m = raw as Partial<FeedsMeta> | null;
  if (!m || typeof m !== "object") throw new Error("feeds meta: not an object");
  if (typeof m.date !== "string" || typeof m.finished !== "string") throw new Error("feeds meta: no date");
  // checked and typed in one place, so the derived flag below needs no assertion
  const count = (k: "rows" | "subfilas_total" | "subfilas_crawled"): number => {
    const v = m[k];
    if (typeof v !== "number") throw new Error(`feeds meta: no ${k}`);
    return v;
  };
  const rows = count("rows");
  const total = count("subfilas_total");
  const crawled = count("subfilas_crawled");
  // the optional blocks are checked as deep as index.astro reads them, so a drifted file fails here, named, instead
  // of with a TypeError in the middle of the page
  if (m.cmed !== undefined) {
    const c = m.cmed as Partial<CmedMeta> | null;
    if (!isObj(c) || typeof c.stamp !== "string") throw new Error("feeds meta: bad cmed");
    for (const k of ["rows", "substancias", "laboratorios", "months"] as const) {
      if (typeof c[k] !== "number") throw new Error(`feeds meta: cmed without ${k}`);
    }
    if (!isObj(c.events) || !numbers(c.events, ["entered", "changed", "left"]))
      throw new Error("feeds meta: cmed without events");
    if (c.destaques !== undefined) {
      const d = c.destaques as Record<string, unknown> | null;
      for (const k of ["altas", "baixas", "entradas", "saidas"]) {
        const lista = isObj(d) ? d[k] : undefined;
        if (!Array.isArray(lista) || !lista.every(isHighlight)) throw new Error(`feeds meta: bad cmed destaques ${k}`);
      }
    }
  }
  if (m.novidades !== undefined) {
    const n = m.novidades as Partial<Novidades> | null;
    if (!isObj(n) || typeof n.dia !== "string" || !numbers(n, ["filas_com_movimento", "entraram", "sairam"]))
      throw new Error("feeds meta: bad novidades");
    if (!Array.isArray(n.filas) || !n.filas.every(isMover)) throw new Error("feeds meta: bad novidades filas");
  }
  return { ...m, rows, subfilas_total: total, subfilas_crawled: crawled, parcial: crawled < total } as FeedsMeta;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const numbers = (o: object, keys: string[]): boolean =>
  keys.every((k) => typeof (o as Record<string, unknown>)[k] === "number");
const strOrNull = (v: unknown): boolean => v === null || typeof v === "string";
const numOrNull = (v: unknown): boolean => v === null || typeof v === "number";
// the fields the home prints of each highlight and each busiest subfila
const isHighlight = (h: unknown): boolean =>
  isObj(h) &&
  strOrNull(h.produto) &&
  strOrNull(h.apresentacao) &&
  strOrNull(h.pagina) &&
  numOrNull(h.variacao) &&
  numOrNull(h.pf_para);
const isMover = (f: unknown): boolean =>
  isObj(f) &&
  typeof f.nome === "string" &&
  typeof f.area === "string" &&
  typeof f.pagina === "string" &&
  numbers(f, ["entraram", "sairam"]);

/**
 * The "na fila" stat of the home: null when the crawl read no subfila, since its 0 was never measured and the page
 * says so in words; on a partial crawl the label says how many subfilas answered, since `rows` counts only those.
 */
export function statNaFila(
  m: Pick<FeedsMeta, "rows" | "subfilas_crawled" | "parcial">,
): { label: string; value: string } | null {
  if (m.subfilas_crawled === 0) return null;
  return {
    label: m.parcial ? `na fila, em ${fmtInt(m.subfilas_crawled)} filas coletadas` : "na fila",
    value: fmtInt(m.rows),
  };
}

/** "20261009" → "2026-10-09", so the formatters treat it as a calendar day. */
export const stampToDate = (stamp: string): string => `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}`;

/**
 * Null when the file is not there or the site cannot be reached (the card degrades); an error when the
 * file exists but does not parse (the contract moved, and the build should say so).
 */
export async function fetchFeedsMeta(url: string): Promise<FeedsMeta | null> {
  const u = new URL(url);
  u.searchParams.set("t", String(Date.now()));
  let res: Response;
  try {
    res = await fetch(u, { cache: "no-store" });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  return parseFeedsMeta(await res.json());
}

let forBuild: Promise<FeedsMeta | null> | undefined;
/** One fetch per build, shared by every page and endpoint. */
export function feedsMetaForBuild(url: string): Promise<FeedsMeta | null> {
  return (forBuild ??= fetchFeedsMeta(url));
}
