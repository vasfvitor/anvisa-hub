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
}

export function parseFeedsMeta(raw: unknown): FeedsMeta {
  const m = raw as Partial<FeedsMeta> | null;
  if (!m || typeof m !== "object") throw new Error("feeds meta: not an object");
  if (typeof m.date !== "string" || typeof m.finished !== "string") throw new Error("feeds meta: no date");
  for (const k of ["rows", "subfilas_total", "subfilas_crawled"] as const) {
    if (typeof m[k] !== "number") throw new Error(`feeds meta: no ${k}`);
  }
  return m as FeedsMeta;
}

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
