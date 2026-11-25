#!/usr/bin/env bash
# The `verify` job of .github/workflows/pages.yml: decides whether a scheduled run publishes, and writes
# `changed=true|false` to $GITHUB_OUTPUT. test/verify.test.ts runs it with a fake curl.
#
# Push and manual dispatch always publish. On a schedule the run publishes when the anvisa-api manifest's
# build_id or the anvisa-feeds meta.json `date` moved against what the site was built from (/build.json), or
# when the last crawl has become older than PARADA_HORAS and the published build does not say so yet
# (`coleta_parada` in /build.json): the home names a stopped crawl only when it is rebuilt.
#
# Inputs (environment): EVENT, MANIFEST, FEEDS_META, PUBLISHED; NOW (epoch seconds) only in tests.
set -uo pipefail

# The same as PARADA_HORAS in src/lib/feeds.ts (test/verify.test.ts checks that they match).
PARADA_HORAS=36

out="${GITHUB_OUTPUT:-/dev/stdout}"
if [ "${EVENT:-}" != schedule ]; then
  echo "changed=true" >>"$out"
  exit 0
fi
now="${NOW:-$(date +%s)}"

# ?t= gets past the 600 s Pages cache. A source that cannot be read is no reason to publish: the build would
# fail on the manifest, or go out with empty feeds cards. The run skips with a warning and the site keeps its
# build; the producer's own alarm says why. A /build.json that cannot be read still publishes: the site itself
# may be broken.
build=$(curl -fsS "$MANIFEST?t=$now" | jq -er .build_id) || build=""
meta=$(curl -fsS "$FEEDS_META?t=$now") || meta=""
feeds=$(jq -er .date <<<"$meta" 2>/dev/null) || feeds=""
finished=$(jq -er .finished <<<"$meta" 2>/dev/null) || finished=""
site=$(curl -fsS "$PUBLISHED?t=$now") || site=""
site_build=$(jq -r .anvisa_build_id <<<"$site" 2>/dev/null) || site_build=""
site_feeds=$(jq -r .feeds_date <<<"$site" 2>/dev/null) || site_feeds=""
site_parada=$(jq -r .coleta_parada <<<"$site" 2>/dev/null) || site_parada=""
echo "manifest: ${build:-?} / ${site_build:-?} · feeds: ${feeds:-?} / ${site_feeds:-?}"

faltou=""
[ -n "$build" ] || faltou="the build_id of the anvisa-api manifest"
[ -n "$feeds" ] && [ -n "$finished" ] || faltou="${faltou:+$faltou and }the date of the anvisa-feeds meta.json"
if [ -n "$faltou" ]; then
  echo "::warning::could not read $faltou; not publishing, the site keeps its current build"
  echo "changed=false" >>"$out"
  exit 0
fi

if [ "$build" != "$site_build" ] || [ "$feeds" != "$site_feeds" ]; then
  echo "changed=true" >>"$out"
  exit 0
fi

# same sources: publish only to say that the crawl stopped, once
fim=$(date -d "$finished" +%s 2>/dev/null) || fim=""
if [ -n "$fim" ] && [ $((now - fim)) -gt $((PARADA_HORAS * 3600)) ] && [ "$site_parada" != true ]; then
  echo "the anvisa-feeds crawl stopped (last one finished $finished); publishing so the site says so"
  echo "changed=true" >>"$out"
  exit 0
fi
echo "unchanged: build $build and feeds $feeds are current"
echo "changed=false" >>"$out"
