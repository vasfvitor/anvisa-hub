// Contract with `anvisa-feeds`: its build writes `meta.json` at the site root, the latest crawl's meta
// (same keys as snapshots/<day>.meta.json) plus totals. The file is newer than the hub's first deploy,
// so a missing file is tolerated: the feeds card then shows the link without numbers.

export interface FeedsMeta {
  /** crawl day, YYYY-MM-DD */
  date: string;
  /** end of the crawl, ISO 8601 with offset */
  finished: string;
  /** processes queued across every subfila on that day */
  rows: number;
  subfilas_total: number;
  subfilas_crawled: number;
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
  for (const k of ["rows", "subfilas_total", "subfilas_crawled"] as const) {
    if (typeof m[k] !== "number") throw new Error(`feeds meta: no ${k}`);
  }
  if (m.cmed !== undefined) {
    const c = m.cmed as Partial<CmedMeta> | null;
    if (!c || typeof c !== "object" || typeof c.stamp !== "string") throw new Error("feeds meta: bad cmed");
    for (const k of ["rows", "substancias", "laboratorios"] as const) {
      if (typeof c[k] !== "number") throw new Error(`feeds meta: cmed without ${k}`);
    }
  }
  return m as FeedsMeta;
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
