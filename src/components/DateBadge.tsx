import { cn } from "@/lib/utils";

function parseLocalDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

export type DateStatus = "hoje" | "amanha" | "atrasado" | "futuro";

export function getDateStatus(iso?: string | null): DateStatus | null {
  if (!iso) return null;
  const d = parseLocalDate(iso);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanha";
  if (diff < 0) return "atrasado";
  return "futuro";
}

export function formatDDMM(iso?: string | null): string {
  if (!iso) return "";
  const d = parseLocalDate(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

interface DateBadgeProps {
  iso?: string | null;
  /** Optional time (HH:mm) shown as a small suffix next to the date */
  horario?: string | null;
  className?: string;
}

/**
 * Highlighted date badge for cards (Eventos / Mudanças).
 * - HOJE → badge azul forte
 * - AMANHÃ → badge amarelo
 * - ATRASADO → badge vermelho
 * - FUTURO → neutro
 */
export function DateBadge({ iso, horario, className }: DateBadgeProps) {
  const status = getDateStatus(iso);
  if (!status) return null;

  const ddmm = formatDDMM(iso);
  const hh = horario ? String(horario).slice(0, 5) : "";

  const styles: Record<DateStatus, string> = {
    hoje: "bg-primary/10 text-primary border-primary/30",
    amanha: "bg-warning/15 text-warning-foreground border-warning/30",
    atrasado: "bg-destructive/10 text-destructive border-destructive/30",
    futuro: "bg-muted text-foreground border-border",
  };

  const label: Record<DateStatus, string | null> = {
    hoje: "HOJE",
    amanha: "AMANHÃ",
    atrasado: "ATRASADO",
    futuro: null,
  };

  const tag = label[status];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-sm font-bold tracking-tight w-fit",
        styles[status],
        className,
      )}
    >
      {tag && (
        <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-background/60">
          {tag}
        </span>
      )}
      <span className="text-base leading-none">{ddmm}</span>
      {hh && <span className="text-xs font-semibold opacity-80">· {hh}</span>}
    </div>
  );
}