import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type Column<T> = {
  key: string;
  label: string;
  accessor: (row: T) => string | number | null | undefined;
};

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export function exportCSV<T>(filename: string, columns: Column<T>[], rows: T[]) {
  const header = columns.map((c) => c.label);
  const body = rows.map((r) => columns.map((c) => c.accessor(r) ?? ""));
  const csv = [header, ...body].map((r) => r.map(csvEscape).join(";")).join("\r\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportPDF<T>(
  filename: string,
  title: string,
  columns: Column<T>[],
  rows: T[],
  meta?: string,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(14);
  doc.text(title, 40, 40);
  doc.setFontSize(9);
  doc.setTextColor(120);
  const stamp = new Date().toLocaleString("pt-BR");
  doc.text(`Gerado em ${stamp}`, pageWidth - 40, 40, { align: "right" });
  if (meta) {
    doc.text(meta, 40, 56);
  }
  doc.setTextColor(0);

  autoTable(doc, {
    head: [columns.map((c) => c.label)],
    body: rows.map((r) => columns.map((c) => String(c.accessor(r) ?? ""))),
    startY: meta ? 70 : 56,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
  });

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return new Date(v).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(v);
  }
}

export function fmtDate(v: string | null | undefined): string {
  if (!v) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  try {
    return new Date(v).toLocaleDateString("pt-BR");
  } catch {
    return String(v);
  }
}