# anvisa-hub

One static Astro page at `https://anvisa.abelhaninja.de` that links contém, anvisa.feeds and the anvisa-api
open data, with numbers read at build time. `README.md` explains the sources and the rebuild schedule; a
git-ignored `NOTES.local.md` holds pending items when present.

## Facts to keep straight

- The domain is `public/CNAME` plus the repository's Pages settings; the settings and the DNS record are the
  user's. The github.io address is not handled here.
- The library's GitHub repo is `vasfvitor/anvisa-api` (PyPI name `anvisa`), not a repo named `anvisa`. Its
  Pages site has no custom domain: `https://vasfvitor.github.io/anvisa-api/`.
- The feeds summary `meta.json` is written by `anvisa-feeds` (`feeds.py`, build step). Its keys are the
  snapshot meta plus `feeds`, `first_snapshot`, `catalog`, `base_url`, `generator`. A change there needs a
  follow-up in `src/lib/feeds.ts`.
- Public text is pt-BR; code, comments, README, workflow and commit subjects are English. Product names are
  spelled as the products spell them: contém, anvisa.feeds, anvisa-api.
- Numbers are never hand-typed. If a stat cannot be read from a source, the card says so.
- No client JavaScript: `pnpm build` must leave no `<script>` other than JSON-LD in `dist/`.

## Workflow

Commit when a unit of work is complete, one subject per commit, no attribution trailers. Commits are
SSH-signed, so `git commit` runs outside the sandbox: keep it as the only command on its line. Run
`git status --short` first and `git add` any new file the change needs. Pushing, Pages settings and
repository secrets are the user's.
