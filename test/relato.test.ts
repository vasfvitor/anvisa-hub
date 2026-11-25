import { describe, expect, it } from "vitest";
import { RELATO_EMAIL, REPOS } from "../src/lib/config";
import { relatoLinks, relatoTitle } from "../src/lib/relato";

const params = (url: string): URLSearchParams => new URLSearchParams(url.slice(url.indexOf("?") + 1));

describe("relato", () => {
  it("titles the report by the item, or by the page when there is none", () => {
    expect(relatoTitle("Novalgina, registro 1.0090.0029", "Produto")).toBe(
      "Problema em Novalgina, registro 1.0090.0029",
    );
    expect(relatoTitle("", "Tabelas da ANVISA em Parquet")).toBe("Problema em Tabelas da ANVISA em Parquet");
  });

  it("prefills the issue form of this repo with the page URL, an empty item and the page title", () => {
    const { issue } = relatoLinks("https://anvisa.abelhaninja.de/dados/", "", "Tabelas da ANVISA em Parquet");
    expect(issue).toBe(
      `${REPOS.hub}/issues/new?template=problema.yml&title=Problema%20em%20Tabelas%20da%20ANVISA%20em%20Parquet` +
        "&pagina=https%3A%2F%2Fanvisa.abelhaninja.de%2Fdados%2F&item=",
    );
    const p = params(issue);
    expect(p.get("pagina")).toBe("https://anvisa.abelhaninja.de/dados/");
    expect(p.get("item")).toBe("");
  });

  it("encodes accents, spaces, & and # so they stay inside their field", () => {
    const item = "Pão & Cia #2, regularização";
    const { issue, mailto } = relatoLinks("https://anvisa.abelhaninja.de/sobre/", item, "Sobre");
    expect(issue).not.toMatch(/[ #À-ÿ]|&(?!(title|pagina|item)=)/);
    expect(mailto).not.toMatch(/[ #+À-ÿ]|&(?!body=)/);
    expect(issue).toContain("item=P%C3%A3o%20%26%20Cia%20%232%2C%20regulariza%C3%A7%C3%A3o");
    expect(params(issue).get("item")).toBe(item);
    expect(params(issue).get("title")).toBe(`Problema em ${item}`);
    expect(params(mailto).get("subject")).toBe(`Problema em ${item}`);
  });

  it("writes the e-mail to RELATO_EMAIL with the page and the item in the body, newlines as %0A", () => {
    const { mailto } = relatoLinks("https://anvisa.abelhaninja.de/", "", "Início");
    expect(RELATO_EMAIL).toBe("ajuda@abelhaninja.de");
    expect(mailto.startsWith(`mailto:${RELATO_EMAIL}?subject=Problema%20em%20In%C3%ADcio&body=`)).toBe(true);
    expect(mailto).toContain("%0A");
    expect(mailto).not.toContain("\n");
    expect(params(mailto).get("body")).toBe(
      "Página: https://anvisa.abelhaninja.de/\nItem: \n\nO que está errado:\n\nO que a fonte oficial mostra (link):\n",
    );
  });
});
