// .github/actions/alerta/alerta.sh opens, updates and closes alarm issues for three other repos
// (anvisa-api, anvisa-feeds, ans-feeds), which call it at @main: this test is its gate.
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = join(import.meta.dirname, "..", ".github", "actions", "alerta", "alerta.sh");

// A fake gh: answers `issue list` with $FAKE_ISSUES, prints a URL for `issue create`, and logs each
// call's first two words to calls.txt and the --body or --comment it got to body.txt.
const FAKE_GH = `#!/usr/bin/env bash
set -euo pipefail
echo "$1 $2" >> "$FAKE_DIR/calls.txt"
args=("$@")
for i in "\${!args[@]}"; do
  case "\${args[$i]}" in
    --body | --comment) printf '%s' "\${args[$((i + 1))]}" > "$FAKE_DIR/body.txt" ;;
    --title) printf '%s' "\${args[$((i + 1))]}" > "$FAKE_DIR/title.txt" ;;
  esac
done
case "$1 $2" in
  "issue list") printf '%s' "$FAKE_ISSUES" ;;
  "issue create") echo "https://github.com/vasfvitor/exemplo/issues/12" ;;
esac
`;

interface Resultado {
  status: number | null;
  saida: string;
  chamadas: string[];
  corpo: string;
  titulo: string;
}

function rodar(estado: string, issues: { number: number; body: string }[] = []): Resultado {
  const dir = mkdtempSync(join(tmpdir(), "alerta-"));
  const gh = join(dir, "gh");
  writeFileSync(gh, FAKE_GH);
  chmodSync(gh, 0o755);
  const r = spawnSync("bash", [SCRIPT], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${dir}:${process.env.PATH ?? ""}`,
      FAKE_DIR: dir,
      FAKE_ISSUES: JSON.stringify(issues),
      ALERTA_CHAVE: "anvisa-fonte-parada",
      ALERTA_TITULO: "ANVISA parada: 8 tabelas",
      ALERTA_ESTADO: estado,
      ALERTA_CORPO: "- alimentos: 21 dias",
      ALERTA_RUNBOOK: "https://github.com/vasfvitor/anvisa-api/blob/main/RUNBOOK.md#fonte-parada-na-anvisa",
      ALERTA_RUN: "https://github.com/vasfvitor/anvisa-api/actions/runs/1",
    },
  });
  const ler = (nome: string) => (existsSync(join(dir, nome)) ? readFileSync(join(dir, nome), "utf8") : "");
  return {
    status: r.status,
    saida: r.stdout + r.stderr,
    chamadas: ler("calls.txt").split("\n").filter(Boolean),
    corpo: ler("body.txt"),
    titulo: ler("title.txt"),
  };
}

const MARCA = "<!-- alerta:anvisa-fonte-parada -->";

describe("alerta.sh", () => {
  it("does nothing when the check did not run", () => {
    const r = rodar("");
    expect(r.status).toBe(0);
    expect(r.chamadas).toEqual([]);
  });

  it("refuses an unknown estado", () => {
    const r = rodar("talvez");
    expect(r.status).toBe(1);
    expect(r.saida).toContain("::error::");
    expect(r.chamadas).toEqual([]);
  });

  it("opens an issue with the marker, the details and the RUNBOOK link", () => {
    const r = rodar("ativo");
    expect(r.status).toBe(0);
    expect(r.chamadas).toEqual(["issue list", "label create", "issue create"]);
    expect(r.titulo).toBe("ANVISA parada: 8 tabelas");
    expect(r.corpo).toContain(MARCA);
    expect(r.corpo).toContain("- alimentos: 21 dias");
    expect(r.corpo).toContain("RUNBOOK.md#fonte-parada-na-anvisa");
    expect(r.corpo).toContain("actions/runs/1");
    expect(r.saida).toContain("::warning::");
  });

  it("updates the open issue in place instead of opening another", () => {
    const r = rodar("ativo", [{ number: 7, body: `${MARCA}\nantes` }]);
    expect(r.status).toBe(0);
    expect(r.chamadas).toEqual(["issue list", "issue edit"]);
    expect(r.corpo).toContain("- alimentos: 21 dias");
  });

  it("opens its own issue when only another alarm's is open", () => {
    const r = rodar("ativo", [{ number: 7, body: "<!-- alerta:drift -->\noutro" }]);
    expect(r.chamadas).toEqual(["issue list", "label create", "issue create"]);
  });

  it("closes the open issue with a comment when back to normal", () => {
    const r = rodar("normal", [{ number: 7, body: `${MARCA}\nantes` }]);
    expect(r.status).toBe(0);
    expect(r.chamadas).toEqual(["issue list", "issue close"]);
    expect(r.corpo).toMatch(/^Normalizou em \d{4}-\d{2}-\d{2} \(https:\/\/github\.com\/.+\)\.$/);
  });

  it("does nothing else when normal and no issue is open", () => {
    const r = rodar("normal");
    expect(r.status).toBe(0);
    expect(r.chamadas).toEqual(["issue list"]);
  });
});
