import { format, subDays } from "date-fns";

export const SUMMARY_LIMIT = 1000;
export function summaryRange(now = new Date()) {
  return {
    rangeStart: format(subDays(now, 89), "yyyy-MM-dd"),
    rangeEnd: format(now, "yyyy-MM-dd"),
  };
}
export function describeCoverage(
  groups: { label: string; dates: string[] }[],
  range: { rangeStart: string; rangeEnd: string },
  days = 90,
) {
  const dates = groups.flatMap((g) => g.dates).sort();
  const missing = groups.filter((g) => !g.dates.length).map((g) => g.label);
  return [
    `Requested range: ${range.rangeStart} to ${range.rangeEnd} (${days} calendar days).`,
    dates.length
      ? `Records used: ${dates.length}; recorded dates ${dates[0]} to ${dates[dates.length - 1]}.`
      : "No tracked records in this range.",
    groups
      .map(
        (g) =>
          `${g.label}: ${g.dates.length}${g.dates.length >= SUMMARY_LIMIT ? " (limit reached; some records may be excluded)" : ""}`,
      )
      .join("; ") + ".",
    missing.length
      ? `No records for: ${missing.join(", ")}. Missing entries are not treated as zero.`
      : "All listed record types have entries. Unlogged days are not treated as zero.",
  ];
}

/** QA/sample entries must be explicitly labeled, never inferred from health values. */
export function fictionalDataNotice(notes: (string | null | undefined)[]) {
  return notes.some((note) => note?.startsWith("Fictional demo QA record"))
    ? "Includes explicitly labeled fictional demo QA records; these are not actual health observations."
    : null;
}
