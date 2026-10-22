# anvisa-hub

One page at **<https://anvisa.abelhaninja.de>** that connects the open-source projects built on ANVISA's
public data:

- **contém** (<https://contem.abelhaninja.de>, repo [`anvisa-dash`](https://github.com/vasfvitor/anvisa-dash)):
  search of products regularized by ANVISA, in the browser, over the Parquet files below.
- **anvisa.feeds** (<https://anvisa.feeds.abelhaninja.de>, repo
  [`anvisa-feeds`](https://github.com/vasfvitor/anvisa-feeds)): the analysis queues as one Atom feed per subfila.
- **preços CMED** (<https://anvisa.feeds.abelhaninja.de/cmed/>, same repo): CMED's monthly list of maximum
  medicine prices, diffed month over month, as feeds per substância and per laboratório.
- **open data** (<https://vasfvitor.github.io/anvisa-api/>, repo
  [`anvisa-api`](https://github.com/vasfvitor/anvisa-api), PyPI [`anvisa`](https://pypi.org/project/anvisa/)):
  ANVISA's CSVs converted to Parquet daily, with a manifest and a data dictionary.

The page is pt-BR; code, comments and this README are English. Product names stay as each product spells them.

## Where the numbers come from

Nothing on the page is typed by hand. At build time the site reads two files and renders what they say:

| Source                                                 | Used for                                               |
| ------------------------------------------------------ | ------------------------------------------------------ |
| `https://vasfvitor.github.io/anvisa-api/manifest.json` | table count, rows, build date, most recent `loaded_at` |
| `https://anvisa.feeds.abelhaninja.de/meta.json`        | subfilas, processes queued, time of the last crawl     |

The manifest is required: a bad or missing one fails the build, so the previous deploy stays live. The feeds
summary is optional: when it is missing the feeds card shows the link and a note, and the build goes on.

`/build.json` records which manifest `build_id` and which feeds `date` the deploy was built from;
`/llms.txt` repeats the page for assistants and agents.

## Rebuild schedule

`.github/workflows/pages.yml` runs on push, on manual dispatch and on three crons (09:30, 22:30 and 01:30
UTC). On a cron it first compares the two live files with `/build.json` and only rebuilds when one of them
moved. The custom domain comes from `public/CNAME` plus the repository's Pages settings.

## Development

```sh
pnpm install
pnpm dev            # http://localhost:4321, reads the live sources
pnpm format:check && pnpm lint && pnpm test && pnpm check
pnpm build          # static output in dist/
```

For an offline build, serve `test/fixtures/` and point the two variables at it:

```sh
python3 -m http.server -d test/fixtures 8000 &
PUBLIC_MANIFEST_URL=http://localhost:8000/manifest.json \
PUBLIC_FEEDS_META_URL=http://localhost:8000/meta.json pnpm build
```

## Licence

MIT for the code. The data is ANVISA's, reproduced without alteration; the site has no link with ANVISA and
does not replace the official consulta.
