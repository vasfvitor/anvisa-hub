// pt-BR formatting for the numbers the hub shows. Times are shown in Brasília, whatever offset the
// source carries; a date without a time (YYYY-MM-DD) is shown as that calendar day.

const TZ = "America/Sao_Paulo";
const int = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const day = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
const dayTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const fmtInt = (n: number): string => int.format(n);

/** centavos → "R$ 30,73"; null → "–". */
export function fmtMoney(centavos: number | null): string {
  if (centavos === null) return "–";
  const reais = Math.trunc(centavos / 100);
  const cents = Math.abs(centavos % 100);
  return `R$ ${int.format(reais)},${String(cents).padStart(2, "0")}`;
}

/** 10 → "+10,0 %", -3.25 → "−3,3 %". */
export function fmtPct(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(1).replace(".", ",")} %`;
}

/** "2026-10-08" or an ISO timestamp → "08/10/2026". */
export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return day.format(new Date(iso));
}

/** ISO timestamp → "08/10/2026, 13:11" in Brasília. */
export function fmtDateTime(iso: string): string {
  return dayTime.format(new Date(iso));
}
