export type ReportInput = {
  name: string;
  rangeStart: string;
  rangeEnd: string;
  stats: { label: string; value: string }[];
  insights: string[];
  coverage?: string[];
  symptoms: { name: string; severity: number; count: number }[];
};

/** Builds a printable health summary PDF and triggers a download. */
export async function downloadHealthReport(input: ReportInput): Promise<string> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = 56;

  doc.setFillColor(66, 39, 72);
  doc.roundedRect(margin - 16, 24, width - margin * 2 + 32, 78, 12, 12, "F");
  doc.setTextColor(255, 250, 246);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("HerCare AI", margin, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("YOUR PERSONAL HEALTH SUMMARY", margin, y + 24);
  y = 126;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(81, 68, 83);
  const nameLines = doc.splitTextToSize(`Prepared for ${input.name}`, width - margin * 2);
  doc.text(nameLines, margin, y);
  y += nameLines.length * 14;
  doc.text(`Period covered: ${input.rangeStart} to ${input.rangeEnd}`, margin, y);
  y += 24;
  doc.setTextColor(49, 38, 53);

  const section = (title: string) => {
    if (y > 728) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(66, 39, 72);
    doc.text(title, margin, y);
    doc.setDrawColor(226, 216, 226);
    doc.line(margin, y + 7, width - margin, y + 7);
    y += 23;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(49, 38, 53);
  };

  const bullet = (text: string) => {
    const lines = doc.splitTextToSize(`•  ${text}`, width - margin * 2);
    for (const line of lines) {
      if (y + 14 > 778) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 14;
    }
    y += 2;
  };

  section("Key metrics");
  input.stats.forEach((s) => bullet(`${s.label}: ${s.value}`));
  y += 8;

  section("Insights");
  input.insights.forEach(bullet);
  y += 8;

  if (input.symptoms.length) {
    section("Most logged symptoms");
    input.symptoms.forEach((s) =>
      bullet(
        `${s.name} - average severity ${s.severity}/5 across ${s.count} ${s.count === 1 ? "entry" : "entries"}`,
      ),
    );
    y += 8;
  }

  if (input.coverage?.length) {
    section("What informed this summary?");
    input.coverage.forEach(bullet);
    y += 8;
  }

  section("Disclaimer");
  bullet(
    "This report contains self-reported wellness data and educational information only. It is not a medical diagnosis. Please review it with a qualified clinician.",
  );

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(226, 216, 226);
    doc.line(margin, 796, width - margin, 796);
    doc.setFontSize(8);
    doc.setTextColor(100, 86, 104);
    doc.text("HerCare AI | Personal records. Educational context.", margin, 812);
    doc.text(`${page} / ${pages}`, width - margin, 812, { align: "right" });
  }

  const fileName = `hercare-report-${input.rangeEnd}.pdf`;
  doc.save(fileName);
  return fileName;
}
