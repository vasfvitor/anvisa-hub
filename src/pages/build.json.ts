// What this deploy was built from. The workflow's cron compares these with the live sources and only
// rebuilds the site when one of them moved.
import type { APIRoute } from "astro";
import { FEEDS_META_URL, MANIFEST_URL } from "../lib/config";
import { feedsMetaForBuild } from "../lib/feeds";
import { manifestForBuild } from "../lib/manifest";

export const GET: APIRoute = async () => {
  const [{ build_id }, feeds] = await Promise.all([manifestForBuild(MANIFEST_URL), feedsMetaForBuild(FEEDS_META_URL)]);
  const body = { anvisa_build_id: build_id, feeds_date: feeds?.date ?? null };
  return new Response(`${JSON.stringify(body)}\n`, { headers: { "Content-Type": "application/json" } });
};
