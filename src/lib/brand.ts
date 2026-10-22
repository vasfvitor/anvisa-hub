// The hub's own name and the sentences repeated across the page, the feed and llms.txt. Public text is
// pt-BR; the product names (contém, anvisa.feeds, anvisa-api) stay as each product spells them.
export const NAME = "anvisa.abelhaninja.de";

export const TITLE = "Dados da ANVISA, em três entradas";

export const DESCRIPTION =
  "Busca de produtos regularizados, feeds das filas de análise e dados abertos em Parquet. Dados da ANVISA, reproduzidos sem alteração, com a data da última coleta.";

export const DISCLAIMER = "Sem vínculo com a ANVISA. Confira sempre a consulta oficial.";

export const pageTitle = (title: string): string => `${title} · ${NAME}`;
