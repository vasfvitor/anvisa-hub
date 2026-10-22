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
import { feedsMetaForBuild, stampToDate } from "../lib/feeds";
import { fmtDate, fmtDateTime, fmtInt } from "../lib/format";
import { besideManifest, manifestForBuild } from "../lib/manifest";

export const GET: APIRoute = async () => {
  const [m, feeds] = await Promise.all([manifestForBuild(MANIFEST_URL), feedsMetaForBuild(FEEDS_META_URL)]);
  const tables = Object.entries(m.tables)
    .map(
      ([name, t]) =>
        `- ${name}: ${fmtInt(t.rows)} linhas${t.source.loaded_at ? `, dados de ${fmtDate(t.source.loaded_at)}` : ""}`,
    )
    .join("\n");
  const feedsLine = feeds
    ? `${fmtInt(feeds.subfilas_total)} subfilas, ${fmtInt(feeds.rows)} processos na fila na coleta de ${fmtDateTime(feeds.finished)}.`
    : "O resumo das filas (meta.json) ainda não estava publicado neste build.";
  const cmedLine = feeds?.cmed
    ? `${fmtInt(feeds.cmed.rows)} apresentações de ${fmtInt(feeds.cmed.substancias)} substâncias e ${fmtInt(feeds.cmed.laboratorios)} laboratórios na lista de ${fmtDate(stampToDate(feeds.cmed.stamp))}.`
    : "Ainda sem lista guardada neste build.";

  const text = `# ${NAME}

> ${TITLE}. ${DESCRIPTION} Projeto de Virtuaires, sem vínculo com a ANVISA: para qualquer decisão, confira a consulta oficial em ${ANVISA_CONSULTAS_URL}.

Páginas deste site: / (busca, o que mudou hoje, os quatro sites), /dados/ (todas as tabelas do manifest, com linhas e data da origem), /sobre/ (o que cada site faz e o que fica de fora).

## contém

${CONTEM_URL}: busca de alimentos, suplementos, produtos de limpeza e cosméticos regularizados pela ANVISA, por marca, nome, empresa, CNPJ ou número do rótulo. A busca roda no navegador sobre os Parquet abaixo; sem JavaScript há uma página por empresa (${CONTEM_URL}empresa/<CNPJ>/) e um ${CONTEM_URL}llms.txt próprio. Código: ${REPOS.dash}

## anvisa.feeds

${FEEDS_URL}: as filas de análise de petições da ANVISA, um feed Atom por subfila, com o que entrou, saiu e mudou de posição a cada dia. Todas as filas em ${FEEDS_URL}feeds.opml; cada fila também em JSON (${FEEDS_URL}fila/<id>.json); resumo em ${FEEDS_URL}meta.json. ${feedsLine} Código: ${REPOS.feeds}

## preços CMED

${FEEDS_URL}cmed/: a lista mensal de preços máximos de medicamentos da CMED (PF, PMC e PMVG por alíquota de ICMS), um feed Atom por substância (${FEEDS_URL}cmed/substancia/<slug>.xml) e por laboratório (${FEEDS_URL}cmed/laboratorio/<cnpj>.xml), mais o geral (${FEEDS_URL}cmed/geral.xml), com o que entrou, saiu e mudou a cada lista; OPML em ${FEEDS_URL}cmed/cmed.opml; cada página também em JSON. ${cmedLine} A tabela completa (102 colunas) é o Parquet cmed do anvisa-api abaixo.

## dados abertos (anvisa-api)

${DADOS_URL}: os CSVs de ${ANVISA_DADOS_URL} convertidos em Parquet, build ${m.build_id} de ${fmtDate(m.built_at)}. O manifest (${MANIFEST_URL}) lista os arquivos atuais, com caminho, linhas, colunas, sha256 e origem; os caminhos mudam a cada build. Dicionário de dados: ${besideManifest(MANIFEST_URL, m.docs ?? "dicionario.html")}. Biblioteca Python: ${PYPI_URL} (cliente da API Consultas Externas e o pipeline dos dados). Código: ${REPOS.api}

${tables}
`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
