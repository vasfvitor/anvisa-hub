// The hub's own name and the sentences shared by the pages and llms.txt. Public text is pt-BR, short, and
// the product names stay as each product spells them: contém, anvisa.feeds, anvisa-api.
export const NAME = "anvisa.abelhaninja.de";

export const TITLE = "ANVISA em dados abertos";

export const DESCRIPTION =
  "Produtos regularizados, filas de análise, preços da CMED e as tabelas em Parquet. Dados públicos da ANVISA, com a data de cada coleta.";

export const DISCLAIMER = "Sem vínculo com a ANVISA ou a CMED. A consulta oficial continua valendo.";

export const AUTHOR = { name: "Virtuaires", url: "https://virtuaires.com.br" };

export const pageTitle = (title: string): string => `${title} · ${NAME}`;
