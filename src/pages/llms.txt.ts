// /llms.txt: the three products explained for assistants and agents, with the same numbers as the page.
import type { APIRoute } from "astro";
import { DESCRIPTION, NAME, TITLE } from "../lib/brand";
import {
  ANVISA_CONSULTAS_URL,
  ANVISA_DADOS_URL,
  CONTEM_URL,
  DADOS_URL,
  FEEDS_META_URL,
  FEEDS_URL,
  MANIFEST_URL,
  PYPI_URL,
  REPOS,
} from "../lib/config";
import { coletaParada, feedsMetaForBuild, stampToDate, statNaFila } from "../lib/feeds";
import { fmtDate, fmtDateTime, fmtInt } from "../lib/format";
import { besideManifest, columnCount, manifestForBuild } from "../lib/manifest";

export const GET: APIRoute = async () => {
  const [m, feeds] = await Promise.all([manifestForBuild(MANIFEST_URL), feedsMetaForBuild(FEEDS_META_URL)]);
  const tables = Object.entries(m.tables)
    .map(
      ([name, t]) =>
        `- ${name}: ${fmtInt(t.rows)} linhas${t.source.loaded_at ? `, carga da ANVISA de ${fmtDate(t.source.loaded_at)}` : ""}`,
    )
    .join("\n");
  const feedsLine = !feeds
    ? "O resumo das filas (meta.json) ainda não estava publicado neste build."
    : statNaFila(feeds)
      ? `${fmtInt(feeds.subfilas_total)} subfilas, ${fmtInt(feeds.rows)} processos na fila na coleta de ${fmtDateTime(feeds.finished)}${feeds.parcial ? ` (só ${fmtInt(feeds.subfilas_crawled)} subfilas responderam nessa coleta)` : ""}.`
      : `${fmtInt(feeds.subfilas_total)} subfilas; nenhuma respondeu na coleta de ${fmtDateTime(feeds.finished)}, então não há contagem de processos na fila.`;
  const parada = feeds ? coletaParada(feeds, new Date()) : null;
  const cmedLine = feeds?.cmed
    ? `${fmtInt(feeds.cmed.rows)} apresentações de ${fmtInt(feeds.cmed.substancias)} substâncias e ${fmtInt(feeds.cmed.laboratorios)} laboratórios na lista de ${fmtDate(stampToDate(feeds.cmed.stamp))}.`
    : "Ainda sem lista guardada neste build.";
  // the column count is the manifest's, so it follows the pipeline when a column is added
  const cmedColunas = columnCount(m, "cmed");
  const cmedTabela = m.tables.cmed
    ? ` A tabela completa${cmedColunas ? ` (${fmtInt(cmedColunas)} colunas)` : ""} é o Parquet cmed do anvisa-api abaixo.`
    : "";

  const text = `# ${NAME}

> ${TITLE}. ${DESCRIPTION} Projeto de Virtuaires, sem vínculo com a ANVISA; não substitui a consulta oficial em ${ANVISA_CONSULTAS_URL}.

Páginas deste site: / (busca, as últimas mudanças de cada fonte, os quatro sites), /dados/ (todas as tabelas do manifest, com linhas e data da carga da ANVISA), /sobre/ (o que cada site faz, o que fica de fora, perguntas frequentes).

Respostas curtas: está liberado? busque no contém. Em que posição está? assine o feed da subfila em anvisa.feeds e filtre pelo processo. Quanto pode custar? a lista da CMED, por substância, em anvisa.feeds/cmed. Os valores são os que a ANVISA publica; os CSVs são convertidos para Parquet, e as entradas, saídas e mudanças são calculadas pelo anvisa.feeds.

## contém

${CONTEM_URL}: busca de alimentos, suplementos, produtos de limpeza e cosméticos regularizados pela ANVISA, por marca, nome, empresa, CNPJ ou número do rótulo. A busca roda no navegador sobre os Parquet abaixo; sem JavaScript há uma página por empresa (${CONTEM_URL}empresa/<CNPJ>/) e um ${CONTEM_URL}llms.txt próprio. Código: ${REPOS.dash}

## anvisa.feeds

${FEEDS_URL}: as filas de análise de petições da ANVISA, um feed Atom por subfila, com o que entrou, saiu e mudou de posição de uma coleta para a seguinte. Todas as filas em ${FEEDS_URL}feeds.opml; cada fila também em JSON (${FEEDS_URL}fila/<id>.json); resumo em ${FEEDS_URL}meta.json. ${feedsLine}${parada ? ` ${parada}` : ""} Código: ${REPOS.feeds}

## preços CMED

${FEEDS_URL}cmed/: a lista mensal de preços máximos de medicamentos da CMED (PF, PMC e PMVG por alíquota de ICMS), um feed Atom por substância (${FEEDS_URL}cmed/substancia/<slug>.xml) e por laboratório (${FEEDS_URL}cmed/laboratorio/<cnpj>.xml), mais o geral (${FEEDS_URL}cmed/geral.xml), com o que entrou, saiu e mudou a cada lista; OPML em ${FEEDS_URL}cmed/cmed.opml; cada página também em JSON. ${cmedLine}${cmedTabela}

## dados abertos (anvisa-api)

${DADOS_URL}: os CSVs de ${ANVISA_DADOS_URL} convertidos em Parquet, build ${m.build_id} de ${fmtDate(m.built_at)}. O manifest (${MANIFEST_URL}) lista os arquivos deste build, com caminho, linhas, colunas, sha256 e origem; os caminhos mudam a cada build. Dicionário de dados: ${besideManifest(MANIFEST_URL, m.docs ?? "dicionario.html")}. Biblioteca Python: ${PYPI_URL} (cliente da API Consultas Externas e o pipeline dos dados). Código: ${REPOS.api}

${tables}
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
