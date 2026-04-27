import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoTolottiUrl from "@/assets/logo-tolotti.png";
import logo18AnosUrl from "@/assets/logo-tolotti-18anos.png";

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

/* ============================================================
 * Padrão de PDF — Grupo Tolotti
 * Header: logo Tolotti (esq) + título centralizado + logo 18 anos (dir)
 * Linha divisória, condomínio (opcional), data de geração, filtros
 * Tabela com autoTable e rodapé com paginação.
 * ============================================================ */

const logoCache = new Map<string, { dataUrl: string; w: number; h: number }>();

async function loadLogo(url: string): Promise<{ dataUrl: string; w: number; h: number }> {
  const cached = logoCache.get(url);
  if (cached) return cached;
  const res = await fetch(url);
  const blob = await res.blob();
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  const dims: { w: number; h: number } = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
  const entry = { dataUrl, ...dims };
  logoCache.set(url, entry);
  return entry;
}

export type ReportFilter = { label: string; value: string };

export type ReportPDFOptions<T> = {
  filename: string;
  title: string;
  columns: Column<T>[];
  data: T[];
  /** Nome do condomínio, exibido em destaque abaixo do header. */
  condominio?: string;
  /** Filtros aplicados (período, status, etc.). */
  filters?: ReportFilter[];
  /** Orientação da página. Default: landscape. */
  orientation?: "portrait" | "landscape";
};

/** Renderiza o cabeçalho corporativo padrão do Grupo Tolotti. */
async function renderHeader(doc: jsPDF, title: string): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Logos com altura padronizada (~38pt) e largura proporcional.
  const LOGO_H = 38;
  const [logoLeft, logoRight] = await Promise.all([
    loadLogo(logoTolottiUrl),
    loadLogo(logo18AnosUrl),
  ]);
  const leftW = (logoLeft.w / logoLeft.h) * LOGO_H;
  const rightW = (logoRight.w / logoRight.h) * LOGO_H;

  const headerTop = 28;
  doc.addImage(logoLeft.dataUrl, "PNG", margin, headerTop, leftW, LOGO_H);
  doc.addImage(
    logoRight.dataUrl,
    "PNG",
    pageWidth - margin - rightW,
    headerTop,
    rightW,
    LOGO_H,
  );

  // Título centralizado entre os logos.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20, 28, 48);
  doc.text(title, pageWidth / 2, headerTop + LOGO_H / 2 + 4, { align: "center" });

  // Linha divisória.
  const dividerY = headerTop + LOGO_H + 10;
  doc.setDrawColor(200, 206, 216);
  doc.setLineWidth(0.8);
  doc.line(margin, dividerY, pageWidth - margin, dividerY);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  return dividerY;
}

function renderFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(130);
    doc.text("Grupo Tolotti — Relatório gerado pelo sistema", 40, pageHeight - 18);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 40, pageHeight - 18, {
      align: "right",
    });
    doc.setTextColor(0);
  }
}

/** Geração padronizada de PDF para todos os relatórios. */
export async function generateReportPDF<T>(opts: ReportPDFOptions<T>): Promise<void> {
  const {
    filename,
    title,
    columns,
    data,
    condominio,
    filters,
    orientation = "landscape",
  } = opts;

  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  const dividerY = await renderHeader(doc, title);
  let cursorY = dividerY + 16;

  // Linha 1: condomínio (esq) + data de geração (dir)
  const stamp = new Date().toLocaleString("pt-BR");
  doc.setFontSize(9);
  if (condominio) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 28, 48);
    doc.text(`Condomínio: ${condominio}`, margin, cursorY);
  }
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110);
  doc.text(`Gerado em ${stamp}`, pageWidth - margin, cursorY, { align: "right" });
  cursorY += 14;

  // Linha 2+: filtros aplicados
  if (filters && filters.length) {
    doc.setTextColor(70);
    const text = filters.map((f) => `${f.label}: ${f.value}`).join("   •   ");
    const wrapped = doc.splitTextToSize(text, pageWidth - margin * 2);
    doc.text(wrapped, margin, cursorY);
    cursorY += wrapped.length * 11;
  }

  doc.setTextColor(0);

  autoTable(doc, {
    head: [columns.map((c) => c.label)],
    body: data.map((r) => columns.map((c) => String(c.accessor(r) ?? ""))),
    startY: cursorY + 4,
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [20, 28, 48], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: margin, right: margin, bottom: 36 },
  });

  renderFooter(doc);

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

/**
 * Wrapper de compatibilidade — mantém a assinatura antiga `exportPDF`,
 * convertendo o parâmetro `meta` (string) em filtros estruturados.
 */
export async function exportPDF<T>(
  filename: string,
  title: string,
  columns: Column<T>[],
  rows: T[],
  meta?: string,
  condominio?: string,
) {
  const filters: ReportFilter[] = [];
  if (meta) {
    meta
      .split(/\s*•\s*/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((part) => {
        const idx = part.indexOf(":");
        if (idx > -1) {
          filters.push({ label: part.slice(0, idx).trim(), value: part.slice(idx + 1).trim() });
        } else {
          filters.push({ label: "Filtro", value: part });
        }
      });
  }
  await generateReportPDF({ filename, title, columns, data: rows, condominio, filters });
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