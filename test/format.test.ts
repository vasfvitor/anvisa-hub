import { describe, expect, it } from "vitest";
import { fmtDate, fmtDateTime, fmtInt } from "../src/lib/format";

describe("format", () => {
  it("integers in pt-BR", () => {
    expect(fmtInt(9364)).toBe("9.364");
    expect(fmtInt(0)).toBe("0");
  });
  it("a plain date stays the calendar day", () => {
    expect(fmtDate("2026-10-08")).toBe("08/10/2026");
  });
  it("a timestamp is shown in Brasília", () => {
    // 23:13 UTC is 20:13 in Brasília, same day
    expect(fmtDate("2026-10-06T23:13:12Z")).toBe("06/10/2026");
    // 02:00 UTC is still the previous day in Brasília
    expect(fmtDate("2026-10-07T02:00:00Z")).toBe("06/10/2026");
    expect(fmtDateTime("2026-10-08T13:11:43.363037-03:00")).toBe("08/10/2026, 13:11");
  });
});
