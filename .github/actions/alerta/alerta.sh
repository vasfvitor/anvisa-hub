#!/usr/bin/env bash
# Opens, updates or closes the issue of one alarm. action.yml passes ALERTA_CHAVE, ALERTA_TITULO,
# ALERTA_ESTADO (ativo, normal or empty), ALERTA_CORPO, ALERTA_RUNBOOK, ALERTA_RUN, GH_REPO and the
# token. One open issue per key, found by the marker in its body among the open issues labelled
# `alerta` (the listing API, not the search, which lags). Only people with access to the repo can
# label an issue, so an outsider's issue that copies the marker is never taken for the alarm.
# No reminders: the issue mails once when it opens and once when it closes; while it stays
# open its body is updated in place, which sends nothing.
set -euo pipefail

chave=${ALERTA_CHAVE:?}
marca="<!-- alerta:$chave -->"

case "${ALERTA_ESTADO:-}" in
  "")
    echo "alerta $chave: the check did not run, nothing changes"
    exit 0
    ;;
  ativo | normal) ;;
  *)
    echo "::error::alerta $chave: estado '$ALERTA_ESTADO' is not ativo, normal or empty"
    exit 1
    ;;
esac

numero=$(gh issue list --state open --label alerta --limit 100 --json number,body |
  jq -r --arg m "$marca" 'map(select(.body | contains($m))) | .[0].number // empty')

if [ "$ALERTA_ESTADO" = normal ]; then
  if [ -n "$numero" ]; then
    gh issue close "$numero" --comment "Normalizou em $(date -u +%F) ($ALERTA_RUN)." > /dev/null
    echo "alerta $chave: back to normal, issue #$numero closed"
  else
    echo "alerta $chave: normal"
  fi
  exit 0
fi

corpo="$marca
${ALERTA_CORPO:-}

**O que fazer:** ${ALERTA_RUNBOOK:?}

Visto em $(date -u +'%Y-%m-%d %H:%M') UTC, no run $ALERTA_RUN. Esta issue fecha sozinha quando a
situação normalizar."

if [ -z "$numero" ]; then
  gh label create alerta --color d93f0b \
    --description "Aberta e fechada pelos workflows; ver RUNBOOK.md" --force > /dev/null
  url=$(gh issue create --title "${ALERTA_TITULO:?}" --label alerta --body "$corpo")
  echo "::warning::alerta $chave: ${ALERTA_TITULO} ($url)"
else
  gh issue edit "$numero" --title "${ALERTA_TITULO:?}" --body "$corpo" > /dev/null
  echo "::warning::alerta $chave: ${ALERTA_TITULO} (issue #$numero, still open)"
fi
