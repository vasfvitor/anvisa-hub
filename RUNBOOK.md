# RUNBOOK dos projetos de saúde: comece por aqui

Este arquivo é a porta de entrada. Ele tem o mapa dos seis repos, a rotina, o que vale para todos e, no
fim, o que é só do anvisa-hub. Cada repo tem o seu `RUNBOOK.md` com as mensagens de erro dele.

As mensagens aparecem como o log mostra. Procure com Ctrl+F um trecho da mensagem que você viu.

Quem cria ou muda um alarme ou uma mensagem de erro atualiza o RUNBOOK do repo no mesmo commit.

## Os seis repos

Horários em UTC, com Brasília entre parênteses (UTC−3).

| Repo                                                      | Site                           | O que faz                                                                                                     | Workflows agendados                                                                                          |
| --------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [anvisa-api](https://github.com/vasfvitor/anvisa-api)     | vasfvitor.github.io/anvisa-api | Baixa os dados abertos da ANVISA e publica Parquet + `manifest.json`. É também a biblioteca `anvisa` no PyPI. | `dados` 21:00 (18:00); `drift` dias 1 e 15, 09:17 (06:17); `keepalive` dia 1                                 |
| [anvisa-feeds](https://github.com/vasfvitor/anvisa-feeds) | anvisa.feeds.abelhaninja.de    | Fila de análise da ANVISA em feeds, e a lista de preços da CMED com `cmed/dados/` para o portal               | `crawl` 09:00 (06:00)                                                                                        |
| [ans-feeds](https://github.com/vasfvitor/ans-feeds)       | ans.feeds.abelhaninja.de       | Dados das operadoras da ANS em feeds e em `dados/` para o portal                                              | `feeds` 10:30 (07:30)                                                                                        |
| [anvisa-dash](https://github.com/vasfvitor/anvisa-dash)   | contem.abelhaninja.de (contém) | Busca de produtos e empresas sobre os Parquet do anvisa-api                                                   | `Publicar site` 22:30, 01:30, 04:30 (19:30, 22:30, 01:30); `Testes ao vivo` 06:15 (03:15); `keepalive` dia 1 |
| [portal-saude](https://github.com/vasfvitor/portal-saude) | saude.abelhaninja.de           | Portal para o público: planos de saúde e preços de remédios                                                   | `Publish site` 13:15, 17:45, 21:15 (10:15, 14:45, 18:15); `keepalive` dia 1                                  |
| [anvisa-hub](https://github.com/vasfvitor/anvisa-hub)     | anvisa.abelhaninja.de          | Página com os links e os números dos projetos da ANVISA                                                       | `Publish site` 09:30, 22:30, 01:30 (06:30, 19:30, 22:30); `keepalive` dia 1                                  |

O GitHub costuma atrasar os crons, às vezes em horas.

## Quem depende de quem

```text
ANVISA, dados abertos ──> anvisa-api ──> contém (build e busca ao vivo)
                                     ├─> anvisa-feeds (situação, medidas, nomes oficiais)
                                     └─> hub
ANVISA, API da fila + CMED ──> anvisa-feeds ──> portal (remédios)
                                            └─> hub
ANS ──> ans-feeds ──> portal (planos)
```

Cada produtor publica no seu horário, e cada consumidor reconstrói no seu, por cron. Um repo não dispara o
outro. Por isso, um problema num produtor costuma aparecer vermelho também nos consumidores.

## Qual RUNBOOK abrir

| Ficou vermelho                                                | Abra                                                                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| anvisa-api: `dados`, `drift`, `ci`, `release`, `keepalive`    | [RUNBOOK do anvisa-api](https://github.com/vasfvitor/anvisa-api/blob/main/RUNBOOK.md)     |
| anvisa-feeds: `crawl` (jobs crawl, cmed, build, deploy), `ci` | [RUNBOOK do anvisa-feeds](https://github.com/vasfvitor/anvisa-feeds/blob/main/RUNBOOK.md) |
| ans-feeds: `feeds` (jobs snapshot, build, deploy), `ci`       | [RUNBOOK do ans-feeds](https://github.com/vasfvitor/ans-feeds/blob/main/RUNBOOK.md)       |
| anvisa-dash: `Publicar site`, `Testes ao vivo`, `keepalive`   | [RUNBOOK do contém](https://github.com/vasfvitor/anvisa-dash/blob/main/RUNBOOK.md)        |
| portal-saude: `Publish site`, `keepalive`                     | [RUNBOOK do portal](https://github.com/vasfvitor/portal-saude/blob/main/RUNBOOK.md)       |
| anvisa-hub: `Publish site`, `keepalive`                       | [Este arquivo, seção anvisa-hub](#anvisa-hub)                                             |

Alarmes que ficam vermelhos num repo por causa de outro:

| Onde fica vermelho | Mensagem                                                                 | O problema está em                    |
| ------------------ | ------------------------------------------------------------------------ | ------------------------------------- |
| anvisa-feeds       | `went out without the registration status`, `without the official names` | anvisa-api                            |
| ans-feeds          | `the portal could not be read or is more than 2 days behind`             | portal-saude                          |
| contém             | `Testes ao vivo` (qualquer)                                              | anvisa-api mudou algo que o contém lê |
| contém, hub        | `manifest: HTTP`                                                         | anvisa-api fora do ar                 |
| portal             | `HTTP ... at https://ans.feeds...` ou `https://anvisa.feeds...`          | ans-feeds ou anvisa-feeds             |

## Rotina

- **Toda semana, uns 5 minutos.** Abrir a aba Actions de cada repo e ver o que ficou vermelho. Para cada
  vermelho, achar a entrada no RUNBOOK pela mensagem. Vermelho conhecido em 03/11/2026: o `dados` do
  anvisa-api fica vermelho todo dia porque a ANVISA não atualiza oito arquivos desde 13/10/2026.
- **Todo mês, no dia 1 ou 2.**
  - Conferir os quatro `keepalive` (anvisa-api, anvisa-dash, portal-saude, anvisa-hub): verdes e com
    linhas `enabled` no log. Ver [keepalive](#keepalive).
  - Conferir o `drift` do anvisa-api, que roda nos dias 1 e 15.
- **A cada 6 meses.** Revisar a tabela de ICMS do portal (`src/lib/icms.ts`). A próxima revisão vence em
  abril de 2027.
- **De vez em quando.** Ver se a ANVISA publicou versão nova da lista DCB (RUNBOOK do anvisa-api, "Nova
  versão da DCB"). Nenhum alarme avisa disso.

O e-mail de falha de um run agendado vai para quem editou por último a linha do cron daquele workflow.

## O que vale para todos

### Rodar de novo

Actions → escolher o workflow → "Run workflow" no `main`. Prefira isso a "Re-run jobs": o re-run parte do
mesmo commit do run original, e nos repos que fazem commit de snapshot (anvisa-feeds, ans-feeds) isso dá
conflito no `git pull --rebase`.

### Run cinza

Um run cinza, "cancelled", quase sempre foi cancelado pelo próprio GitHub: o workflow só deixa um run na
fila de cada vez, e um run novo cancela o que estava esperando. Não precisa fazer nada.

### Lockfile desatualizado

- **pnpm** (contém, portal, hub): `ERR_PNPM_OUTDATED_LOCKFILE`. Alguém mudou o `package.json` sem
  atualizar o lockfile. Na máquina, `pnpm install` e commit do `pnpm-lock.yaml`.
- **uv** (anvisa-api, anvisa-feeds, ans-feeds): o `uv sync --locked` falha dizendo que o `uv.lock` precisa
  ser atualizado. Na máquina, `uv lock` (no anvisa-api, dentro de `packages/python`) e commit do `uv.lock`.
- Se o erro for de rede (o registro do npm ou o PyPI fora do ar), basta rodar de novo.

### Aviso de action antiga

As actions estão fixadas por versão. Quando o GitHub anuncia que a versão de uma delas vai parar de
funcionar, o run fica verde, mas com um aviso amarelo. Não é urgente, mas a action precisa ser atualizada
antes da data que o aviso diz.

### Tempo esgotado

O job passou do limite de minutos ("exceeded the maximum execution time"). Rodar de novo. Se repetir, a
fonte está lenta ou o site cresceu. Ver o RUNBOOK do repo.

### Deploy do Pages falhou

O passo `deploy-pages` deu erro. O site anterior continua no ar.

1. Rodar de novo.
2. Se repetir, conferir em Settings → Pages que a fonte é "GitHub Actions".
3. Ver se o GitHub está com problema em https://www.githubstatus.com.

### Certificado do Pages

Sintoma: o site abre com aviso de certificado, ou só por `http://`. O portal tem um plano B que lê o
`build.json` por `http`, e o hub não tem.

Para refazer o certificado (comandos do `gh`, rodados por você):

1. `gh api -X PUT repos/vasfvitor/<repo>/pages -F cname=null`
2. Pôr o domínio de novo: `gh api -X PUT repos/vasfvitor/<repo>/pages -F cname=<domínio>`
3. Esperar o estado do certificado ficar `approved`:
   `gh api repos/vasfvitor/<repo>/pages --jq .https_certificate.state`
4. `gh api -X PUT repos/vasfvitor/<repo>/pages -F https_enforced=true`

Foi feito no portal e no hub em 26/10/2026.

### Cron desligado

O GitHub desliga os workflows agendados de um repo público depois de 60 dias sem atividade, e manda um
e-mail. O anvisa-feeds e o ans-feeds fazem commit de snapshot quase todo dia e não correm esse risco. Os outros quatro têm o
`keepalive`. Se um workflow aparecer como desligado: na página dele, "Enable workflow", depois "Run
workflow".

### keepalive

Roda no dia 1 de cada mês, às 07:41 UTC, nos quatro repos que não fazem commit pelo CI. Reativa os
workflows do repo.

- **Vermelho:** uma chamada à API do GitHub falhou. Rodar de novo.
- **Verde:** abrir o log e conferir as linhas `enabled .github/workflows/...`. Se não houver nenhuma, ele
  não fez nada. É um problema conhecido: se a primeira chamada falhar, o passo sai verde mesmo assim.

## anvisa-hub

O `Publish site` roda em push no `main`, à mão, e três vezes por dia (09:30, 22:30 e 01:30 UTC). Nos
horários fixos, o job `verify` compara o `build_id` do manifest do anvisa-api e a data do `meta.json` do
anvisa-feeds com `/build.json` do site. Só publica quando um deles mudou. Se não conseguir ler algum,
publica mesmo assim.

O manifest é obrigatório. O `meta.json` do feeds é opcional. Em qualquer falha do build, **o site anterior
continua no ar**.

### anvisa-api fora do ar

- **Onde aparece:** passo Build (ou `check`).
- **Mensagens:** `manifest: HTTP 503 at https://vasfvitor.github.io/anvisa-api/manifest.json`, ou
  `TypeError: fetch failed`.
- **O que quer dizer:** o manifest não abriu. Enquanto isso durar, o `verify` também não consegue ler e
  manda publicar, então o run pode ficar vermelho três vezes por dia.
- **Agir ou esperar:** esperar. Ver o
  [RUNBOOK do anvisa-api](https://github.com/vasfvitor/anvisa-api/blob/main/RUNBOOK.md).

### Contrato de uma fonte mudou

- **Onde aparece:** passo Build.
- **Mensagens:**
  - do manifest: `manifest: schema_version N (expected 1)`, `manifest: not an object`,
    `manifest: no build_id`, `manifest: no tables`;
  - do `meta.json` do feeds: `feeds meta: schema_version N`, `feeds meta: not an object`,
    `feeds meta: no date`, `feeds meta: no <campo>`, `feeds meta: bad cmed`,
    `feeds meta: cmed without <campo>`, `feeds meta: bad cmed destaques <lista>`,
    `feeds meta: bad novidades`, `feeds meta: bad novidades filas`.
- **O que quer dizer:** o anvisa-api ou o anvisa-feeds mudou o formato de um arquivo que o hub lê.
- **O site foi afetado?** Não. O site anterior continua, mas não atualiza.
- **Agir ou esperar:** pedir ajuda. A correção vai em `src/lib/manifest.ts` ou `src/lib/feeds.ts` e nas
  fixtures de `test/fixtures/`.

### Dado mal formado

- **Onde aparece:** passo Build.
- **Mensagens:** `SyntaxError: Unexpected token ...` ou `RangeError: Invalid time value`.
- **O que quer dizer:** uma fonte respondeu algo que não é JSON (uma página de erro, por exemplo), ou uma
  data num formato inesperado.
- **O que fazer:** rodar de novo mais tarde.
- **Pedir ajuda quando:** repetir.

### Lint, formato, testes ou tipos

- **Onde aparece:** passos `pnpm format:check`, `pnpm lint`, `pnpm test` ou `pnpm check`.
- **O que fazer**, na máquina:

  ```bash
  pnpm install
  pnpm format        # corrige a formatação
  pnpm lint
  pnpm test
  pnpm check
  ```

- O `format:check` também confere o `pnpm-lock.yaml`. Se ele acusar esse arquivo depois de uma
  atualização de dependências, `pnpm format` e commit.

### Problemas conhecidos

Achados em 2026-11-03, ainda sem correção. A maior parte vai mudar quando o hub virar a página de status
dos dados (fase 5 do plano de manutenção).

- **"dados de" esconde as tabelas paradas.** O número no topo é a data da tabela mais nova. Com oito
  tabelas paradas desde 13/10/2026, ele mostra uma data recente. A página `/dados/` tem a data de cada
  tabela.
- **`falhas` ignorado.** Uma tabela que o anvisa-api manteve do build anterior aparece como se estivesse
  em dia.
- **Feeds fora do ar publica cards vazios, com o run verde.** Se o `meta.json` do anvisa-feeds não abrir,
  o hub publica assim mesmo, com "Resumo ainda não publicado.", "Sem resumo neste build." e afins. O
  próximo horário volta ao normal, depois que o feeds voltar.
- **Ninguém vigia se o hub e o contém estão em dia.** Se o cron deles parar, nenhum outro workflow fica
  vermelho. O portal tem esse alarme (no ans-feeds); estes dois, não.
- **keepalive verde sem ter feito nada.** Ver [keepalive](#keepalive).
