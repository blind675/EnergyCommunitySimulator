import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Member, SimulationResult, PriceConfig } from "../types";
import { MONTHS } from "../constants";

function fmt(n: number, dec = 1) { return n.toFixed(dec).replace(".", ","); }
function fmtLei(n: number) { return fmt(n, 2) + " lei"; }

export function generateResultsPdf(
  members: Member[],
  results: SimulationResult,
  monthIdx: number,
  totalSavings: number,
  totalBillBefore: number,
  communityName: string = "Comunitatea Altringen",
  prices: PriceConfig,
) {
  const month = MONTHS[monthIdx];
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // ── Header ──
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`${communityName} — Rezultate Simulare`, 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Luna: ${month.name} | Factor solar: ${month.solarFactor} | Algoritm: proportional`, 14, 25);
  doc.text(`Generat: ${new Date().toLocaleDateString("ro-RO")}`, 14, 30);

  // ── Summary boxes ──
  doc.setTextColor(0);
  doc.setFontSize(9);
  const summaryY = 37;
  const summaryItems = [
    { label: "Total produs", value: `${fmt(results.totalProduced)} kWh` },
    { label: "Energie partajata", value: `${fmt(results.totalShared)} kWh` },
    { label: "Surplus injectat retea", value: `${fmt(results.totalSurplus)} kWh` },
    { label: "Economii totale", value: `${fmtLei(totalSavings)} (${fmt(totalSavings / totalBillBefore * 100)}%)` },
    { label: "Autosuficienta", value: `${fmt(results.selfSufficiency)}%` },
  ];
  const boxW = (pageW - 28 - (summaryItems.length - 1) * 3) / summaryItems.length;
  summaryItems.forEach((item, i) => {
    const x = 14 + i * (boxW + 3);
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x, summaryY, boxW, 14, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(item.label, x + 3, summaryY + 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text(item.value, x + 3, summaryY + 11);
  });

  // ── Members table ──
  const isProsumer = (m: Member) => m.type === "prosumator";

  const tableHead = [
    ["Membru", "Tip", "Produs\n(kWh)", "Consumat\n(kWh)", "Autoconsum\n(kWh)", "Din comunitate\n(kWh)", "Din retea\n(kWh)", "Surplus retea\n(kWh)", "Factura fara\ncomunitate", "Factura cu\ncomunitate", "Economii\n(lei)", "Economii\n(%)"],
  ];

  const tableBody = members.map((m, i) => {
    const r = results.members[i];
    return [
      m.name,
      isProsumer(m) ? "Prosumator" : "Consumator",
      isProsumer(m) ? fmt(r.totalProduced) : "—",
      fmt(r.totalConsumed),
      isProsumer(m) ? fmt(r.selfConsumed) : "—",
      fmt(r.sharedReceived),
      fmt(r.gridConsumed),
      isProsumer(m) ? fmt(r.surplusToGrid) : "—",
      fmtLei(r.billWithoutCommunity),
      fmtLei(r.billWithCommunity),
      (r.savings >= 0 ? "-" : "+") + fmtLei(Math.abs(r.savings)),
      fmt(r.savingsPct) + "%",
    ];
  });

  // Totals row
  const totConsumed = results.members.reduce((s, r) => s + r.totalConsumed, 0);
  const totGrid = results.members.reduce((s, r) => s + r.gridConsumed, 0);
  const totSelfCons = results.members.reduce((s, r) => s + r.selfConsumed, 0);
  const totBillBefore = results.members.reduce((s, r) => s + r.billWithoutCommunity, 0);
  const totBillAfter = results.members.reduce((s, r) => s + r.billWithCommunity, 0);

  tableBody.push([
    "TOTAL",
    "",
    fmt(results.totalProduced),
    fmt(totConsumed),
    fmt(totSelfCons),
    fmt(results.totalShared),
    fmt(totGrid),
    fmt(results.totalSurplus),
    fmtLei(totBillBefore),
    fmtLei(totBillAfter),
    fmtLei(totalSavings),
    fmt(totalSavings / totalBillBefore * 100) + "%",
  ]);

  autoTable(doc, {
    startY: summaryY + 20,
    head: tableHead,
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [34, 80, 60],
      textColor: 255,
      fontSize: 7,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: 40,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35 },
      1: { cellWidth: 22 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    // Bold the totals row
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === tableBody.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [230, 245, 235];
      }
    },
    margin: { left: 14, right: 14 },
  });

  // ── Methodological notes ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY ?? 160;
  const notesY = finalY + 8;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60);
  doc.text("Note metodologice", 14, notesY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.setFontSize(7);
  const notes = [
    `Productia solara estimata pentru judetul Timis, factor iradiere ${month.solarFactor} (luna ${month.name})`,
    `Intervalele de 15 min (SED) simulate ca ore pentru simplitate — productia reala vine de la operatorul de distributie`,
    `Pretul intern comunitate (${prices.priceCommunity} lei/kWh) este stabilit de regulamentul intern — poate fi ajustat`,
    `Factura finala a fiecarui membru = energie din retea x ${prices.priceGrid} lei + energie din comunitate x ${prices.priceCommunity} lei`,
    `Prosumatorii primesc ${prices.priceCommunity} lei/kWh pentru energia vanduta in comunitate vs. ${prices.priceInject} lei/kWh injectat in retea`,
  ];
  notes.forEach((n, i) => {
    doc.text(`• ${n}`, 14, notesY + 5 + i * 4);
  });

  // ── Save ──
  const safeName = communityName.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, "_").replace(/_+/g, "_");
  doc.save(`${safeName}_Rezultate_${month.name}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
