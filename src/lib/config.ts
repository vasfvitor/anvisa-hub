// Where the numbers come from. Production reads the two live files; for an offline build point both at
// local copies: PUBLIC_MANIFEST_URL=http://localhost:8000/manifest.json pnpm build
export const MANIFEST_URL: string =
  import.meta.env.PUBLIC_MANIFEST_URL || "https://vasfvitor.github.io/anvisa-api/manifest.json";
export const FEEDS_META_URL: string =
  import.meta.env.PUBLIC_FEEDS_META_URL || "https://anvisa.feeds.abelhaninja.de/meta.json";

// The three products and their repositories. The library's GitHub repo is `anvisa-api`; its PyPI name is `anvisa`.
export const CONTEM_URL = "https://contem.abelhaninja.de/";
export const FEEDS_URL = "https://anvisa.feeds.abelhaninja.de/";
export const DADOS_URL = "https://vasfvitor.github.io/anvisa-api/";
export const PYPI_URL = "https://pypi.org/project/anvisa/";
export const HOME_URL = "https://abelhaninja.de/";
// the public health portal: the CMED price of each medicine by state, for consumers
export const PORTAL_URL = "https://saude.abelhaninja.de/";
export const REPOS = {
  hub: "https://github.com/vasfvitor/anvisa-hub",
  api: "https://github.com/vasfvitor/anvisa-api",
  dash: "https://github.com/vasfvitor/anvisa-dash",
  feeds: "https://github.com/vasfvitor/anvisa-feeds",
} as const;
// A fact that cannot come from the data: one entry with its source and the day it was checked, both shown.
// Art. 4, § 7 says "Os ajustes de preços ocorrerão anualmente"; the law names no month (§ 8 sets only the
// first adjustment, March 2004). The same citation is in anvisa-feeds cmed_site.py AJUSTE_ANUAL.
export const AJUSTE_ANUAL_CMED = {
  lei: "Lei 10.742/2003, art. 4º, § 7º",
  url: "https://www.planalto.gov.br/ccivil_03/leis/2003/l10.742.htm",
  conferido: "2026-11-25",
} as const;
// Where a reader reports a wrong value by e-mail; the GitHub issue form is REPOS.hub's problema.yml (src/lib/relato.ts).
export const RELATO_EMAIL = "ajuda@abelhaninja.de";
export const ANVISA_CONSULTAS_URL = "https://consultas.anvisa.gov.br/";
export const ANVISA_DADOS_URL = "https://dados.anvisa.gov.br/dados/";
