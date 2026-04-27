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

export type ReportSummaryCard = {
  label: string;
  value: string | number;
};

export type ReportPDFOptions<T> = {
  filename: string;
  title: string;
  columns: Column<T>[];
  data: T[];
  /** Nome do condomínio, exibido em destaque abaixo do header. */
  condominio?: string;
  /** Filtros aplicados (período, status, etc.). */
  filters?: ReportFilter[];
  /** Cards-resumo (Total, Pendentes, Finalizadas...). */
  summary?: ReportSummaryCard[];
  /** Orientação da página. Default: landscape. */
  orientation?: "portrait" | "landscape";
};

/* ==== Paleta corporativa Grupo Tolotti ==== */
const C_PRIMARY: [number, number, number] = [0, 51, 102];          // #003366 azul corporativo
const C_BAND: [number, number, number] = [240, 244, 248];           // #f0f4f8 faixa header
const C_INFO_BG: [number, number, number] = [249, 250, 251];        // #f9fafb bloco informações
const C_CARD_BG: [number, number, number] = [238, 242, 247];        // #eef2f7 cards resumo
const C_BORDER: [number, number, number] = [220, 226, 234];
const C_TEXT_DARK: [number, number, number] = [33, 41, 56];
const C_TEXT_MUTED: [number, number, number] = [110, 119, 138];
const C_ZEBRA: [number, number, number] = [248, 250, 252];

const PAGE_MARGIN = 40;

/** Renderiza o cabeçalho corporativo padrão do Grupo Tolotti. */
async function renderHeader(doc: jsPDF, title: string): Promise<number> {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Faixa azul-claro ocupando toda a largura.
  const BAND_H = 78;
  doc.setFillColor(...C_BAND);
  doc.rect(0, 0, pageWidth, BAND_H, "F");

  // Logos proporcionais (altura ~46pt — levemente maiores).
  const LOGO_H = 46;
  const [logoLeft, logoRight] = await Promise.all([
    loadLogo(logoTolottiUrl),
    loadLogo(logo18AnosUrl),
  ]);
  const leftW = (logoLeft.w / logoLeft.h) * LOGO_H;
  const rightW = (logoRight.w / logoRight.h) * LOGO_H;

  const logoY = (BAND_H - LOGO_H) / 2;
  doc.addImage(logoLeft.dataUrl, "PNG", PAGE_MARGIN, logoY, leftW, LOGO_H);
  doc.addImage(
    logoRight.dataUrl,
    "PNG",
    pageWidth - PAGE_MARGIN - rightW,
    logoY,
    rightW,
    LOGO_H,
  );

  // Título centralizado verticalmente, em azul corporativo.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...C_PRIMARY);
  doc.text(title, pageWidth / 2, BAND_H / 2 + 6, { align: "center" });

  // Borda inferior fina da faixa.
  doc.setDrawColor(...C_PRIMARY);
  doc.setLineWidth(1.2);
  doc.line(0, BAND_H, pageWidth, BAND_H);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  return BAND_H;
}

function renderFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Linha separadora acima do rodapé.
    doc.setDrawColor(...C_BORDER);
    doc.setLineWidth(0.5);
    doc.line(PAGE_MARGIN, pageHeight - 30, pageWidth - PAGE_MARGIN, pageHeight - 30);

    doc.setFontSize(8);
    doc.setTextColor(...C_TEXT_MUTED);
    doc.setFont("helvetica", "normal");
    doc.text("Grupo Tolotti — Portaria Virtual", PAGE_MARGIN, pageHeight - 16);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - PAGE_MARGIN, pageHeight - 16, {
      align: "right",
    });
    doc.setTextColor(0);
  }
}

/** Bloco de informações (condomínio, período, data) com fundo leve. */
function renderInfoBlock(
  doc: jsPDF,
  startY: number,
  condominio: string | undefined,
  filters: ReportFilter[] | undefined,
  stamp: string,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const innerW = pageWidth - PAGE_MARGIN * 2;
  const padX = 14;
  const padY = 12;

  // Constrói pares (label, value) — esquerda: condomínio + filtros não-data; direita: período + data geração
  const periodFilter = filters?.find((f) => /per[ií]odo|data/i.test(f.label));
  const otherFilters = (filters ?? []).filter((f) => f !== periodFilter);

  const left: ReportFilter[] = [];
  const right: ReportFilter[] = [];
  if (condominio) left.push({ label: "Condomínio", value: condominio });
  otherFilters.forEach((f) => left.push(f));
  if (periodFilter) right.push(periodFilter);
  right.push({ label: "Gerado em", value: stamp });

  const lineH = 14;
  const rows = Math.max(left.length, right.length, 1);
  const blockH = padY * 2 + rows * lineH;

  // Card com fundo claro e borda sutil.
  doc.setFillColor(...C_INFO_BG);
  doc.setDrawColor(...C_BORDER);
  doc.setLineWidth(0.6);
  doc.roundedRect(PAGE_MARGIN, startY, innerW, blockH, 4, 4, "FD");

  const colW = innerW / 2;
  const drawCol = (items: ReportFilter[], xLabel: number) => {
    items.forEach((it, i) => {
      const y = startY + padY + i * lineH + 9;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...C_TEXT_MUTED);
      doc.text(`${it.label.toUpperCase()}`, xLabel, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...C_TEXT_DARK);
      const valueX = xLabel + 80;
      const value = doc.splitTextToSize(String(it.value), colW - 90);
      doc.text(value[0] ?? "", valueX, y);
    });
  };

  drawCol(left, PAGE_MARGIN + padX);
  drawCol(right, PAGE_MARGIN + colW + padX);

  return startY + blockH;
}

/** Cards-resumo horizontais (TOTAL / PENDENTES / FINALIZADAS...). */
function renderSummaryCards(
  doc: jsPDF,
  startY: number,
  cards: ReportSummaryCard[],
): number {
  if (!cards.length) return startY;
  const pageWidth = doc.internal.pageSize.getWidth();
  const innerW = pageWidth - PAGE_MARGIN * 2;
  const gap = 12;
  const cardW = (innerW - gap * (cards.length - 1)) / cards.length;
  const cardH = 52;

  cards.forEach((card, i) => {
    const x = PAGE_MARGIN + i * (cardW + gap);
    doc.setFillColor(...C_CARD_BG);
    doc.setDrawColor(...C_BORDER);
    doc.setLineWidth(0.6);
    doc.roundedRect(x, startY, cardW, cardH, 4, 4, "FD");

    // Barra lateral azul.
    doc.setFillColor(...C_PRIMARY);
    doc.rect(x, startY, 3, cardH, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...C_TEXT_MUTED);
    doc.text(card.label.toUpperCase(), x + 14, startY + 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...C_PRIMARY);
    doc.text(String(card.value), x + 14, startY + 40);
  });

  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  return startY + cardH;
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
    summary,
    orientation = "landscape",
  } = opts;

  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  const stamp = new Date().toLocaleString("pt-BR");

  const headerH = await renderHeader(doc, title);

  // Bloco de informações com mais respiro.
  let cursorY = headerH + 22;
  cursorY = renderInfoBlock(doc, cursorY, condominio, filters, stamp);

  // Cards-resumo.
  if (summary && summary.length) {
    cursorY += 16;
    cursorY = renderSummaryCards(doc, cursorY, summary);
  }

  // Tabela.
  cursorY += 18;
  autoTable(doc, {
    head: [columns.map((c) => c.label)],
    body: data.map((r) => columns.map((c) => String(c.accessor(r) ?? ""))),
    startY: cursorY,
    styles: {
      fontSize: 8.5,
      cellPadding: 7,
      overflow: "linebreak",
      lineColor: C_BORDER,
      lineWidth: 0.3,
      textColor: C_TEXT_DARK,
    },
    headStyles: {
      fillColor: C_PRIMARY,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 8,
    },
    alternateRowStyles: { fillColor: C_ZEBRA },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: 44 },
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