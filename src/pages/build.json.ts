// What this deploy was built from. The workflow's cron (scripts/verify.sh) compares these with the live sources
// and only rebuilds the site when one of them moved, or when the crawl has stopped since and `coleta_parada`
// is not true yet (null: the feeds summary was not read in this build).
import type { APIRoute } from "astro";
import { FEEDS_META_URL, MANIFEST_URL } from "../lib/config";
import { agoraDoBuild, coletaParada, feedsMetaForBuild } from "../lib/feeds";
import { manifestForBuild } from "../lib/manifest";

export const GET: APIRoute = async () => {
  const [{ build_id }, feeds] = await Promise.all([manifestForBuild(MANIFEST_URL), feedsMetaForBuild(FEEDS_META_URL)]);
  const body = {
    anvisa_build_id: build_id,
    feeds_date: feeds?.date ?? null,
    coleta_parada: feeds ? coletaParada(feeds, agoraDoBuild()) !== null : null,
  };
  return new Response(`${JSON.stringify(body)}\n`, { headers: { "Content-Type": "application/json" } });
};
