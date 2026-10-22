// The hub's own name and the sentences shared by the pages, the feed and llms.txt. Public text is pt-BR,
// short, and the product names stay as each product spells them: contém, anvisa.feeds, anvisa-api.
export const NAME = "anvisa.abelhaninja.de";

export const TITLE = "ANVISA em dados abertos";

export const DESCRIPTION =
  "Busca de produtos regularizados, feeds das filas de análise, preços da CMED e as tabelas em Parquet. Dados da ANVISA, sem alteração, com a data de cada coleta.";

export const DISCLAIMER = "Sem vínculo com a ANVISA ou a CMED. Confira sempre a consulta oficial.";

export const pageTitle = (title: string): string => `${title} · ${NAME}`;
