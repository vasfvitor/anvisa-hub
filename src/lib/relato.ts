// The two ways to report a problem with a page: the GitHub issue form of this repo
// (.github/ISSUE_TEMPLATE/problema.yml, its `pagina` and `item` fields prefilled by query string) and an e-mail
// to RELATO_EMAIL with the same subject and a body to fill in. Built at build time; the site has no client JavaScript.
import { RELATO_EMAIL, REPOS } from "./config";

export interface RelatoLinks {
  issue: string;
  mailto: string;
}

/** "Problema em <item>", or "Problema em <page title>" on a page that is not about one item. */
export const relatoTitle = (item: string, pageTitle: string): string => `Problema em ${item || pageTitle}`;

/**
 * Both links for the page at `pagina` (its canonical absolute URL). `item` is what the page is about, as the reader
 * would name it, with its identifier; empty on pages that are not about one item. encodeURIComponent writes a space
 * as %20, never "+", which mail clients would show as is.
 */
export function relatoLinks(pagina: string, item: string, pageTitle: string): RelatoLinks {
  const title = relatoTitle(item, pageTitle);
  const q = (pairs: [string, string][]): string => pairs.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  // RFC 6068: a line break in a mailto body is CRLF (%0D%0A); some clients join bare LF lines
  const body = `Página: ${pagina}\r\nItem: ${item}\r\n\r\nO que está errado:\r\n\r\nO que a fonte oficial mostra (link):\r\n`;
  return {
    issue: `${REPOS.hub}/issues/new?${q([
      ["template", "problema.yml"],
      ["title", title],
      ["pagina", pagina],
      ["item", item],
    ])}`,
    mailto: `mailto:${RELATO_EMAIL}?${q([
      ["subject", title],
      ["body", body],
    ])}`,
  };
}
