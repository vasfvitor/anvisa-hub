import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchFeedsMeta, parseFeedsMeta } from "../src/lib/feeds";

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
