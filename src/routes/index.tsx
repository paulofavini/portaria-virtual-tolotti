import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import {
  Bell,
  PartyPopper,
  Truck,
  AlertTriangle,
  Wrench,
  ChevronRight,
  Clock,
} from "lucide-react";
import {
  useAvisos,
  useEventos,
  useMudancas,
  useOcorrencias,
  useChamados,
  isToday,
  isYesterday,
  isFuture,
} from "@/lib/queries";
import { cn } from "@/lib/utils";
import { OrientacoesMural } from "@/components/OrientacoesMural";
import { SolicitacoesResumo } from "@/components/SolicitacoesResumo";

export const Route = createFileRoute("/")({
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

function fmtDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
function fmtDateTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  to,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "warning" | "destructive" | "success";
  to: string;
}) {
  const toneClass =
    tone === "destructive"
      ? "bg-destructive/10 text-destructive"
      : tone === "warning"
        ? "bg-warning/15 text-warning-foreground"
        : tone === "success"
          ? "bg-success/15 text-success"
          : "bg-primary/10 text-primary";
  return (
    <Link
      to={to}
      className="group bg-card rounded-xl p-4 border border-border hover:border-primary/40 transition-colors"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </Link>
  );
}

function SectionCard({
  title,
  icon: Icon,
  count,
  to,
  children,
  accent = "primary",
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  to: string;
  children: React.ReactNode;
  accent?: "primary" | "warning" | "destructive" | "success";
}) {
  const accentBar =
    accent === "destructive"
      ? "bg-destructive"
      : accent === "warning"
        ? "bg-warning"
        : accent === "success"
          ? "bg-success"
          : "bg-primary";
  return (
    <div
      className="bg-card rounded-xl border border-border overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className={cn("h-1", accentBar)} />
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">{title}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{count}</span>
          </div>
          <Link to={to} className="text-xs font-medium text-primary hover:underline">
            Ver tudo
          </Link>
        </div>
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-muted-foreground py-3 text-center border border-dashed border-border rounded-lg">
      {children}
    </div>
  );
}

type Item = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: { label: string; tone: "destructive" | "warning" | "success" | "primary" };
};

function Row({ item }: { item: Item }) {
  const toneClass = item.badge
    ? item.badge.tone === "destructive"
      ? "bg-destructive text-destructive-foreground"
      : item.badge.tone === "warning"
        ? "bg-warning text-warning-foreground"
        : item.badge.tone === "success"
          ? "bg-success text-success-foreground"
          : "bg-primary text-primary-foreground"
    : "";
  return (
    <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">{item.title}</span>
          {item.badge && (
            <span className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5 rounded", toneClass)}>
              {item.badge.label}
            </span>
          )}
        </div>
        {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
      </div>
      {item.meta && (
        <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
          <Clock className="h-3 w-3" /> {item.meta}
        </span>
      )}
    </div>
  );
}

function Dashboard() {
  const avisos = useAvisos();
  const eventos = useEventos();
  const mudancas = useMudancas();
  const ocorrencias = useOcorrencias();
  const chamados = useChamados();

  // useAvisos já filtra ativo=true e remove expirados, e ordena por fixado/created_at
  const avisosAtivos = avisos.data ?? [];
  const avisosUrgentes = avisosAtivos.filter((a) => a.tipo === "urgente");
  const avisosHoje = avisosAtivos.filter((a) => isToday(a.data));

  const eventosHoje = (eventos.data ?? []).filter((e) => isToday(e.data));
  const eventosFuturos = (eventos.data ?? []).filter((e) => isFuture(e.data)).slice(0, 5);

  const mudancasHoje = (mudancas.data ?? []).filter((m) => isToday(m.data));
  const mudancasFuturas = (mudancas.data ?? []).filter((m) => isFuture(m.data)).slice(0, 5);

  const ocorrenciasHoje = (ocorrencias.data ?? []).filter((o) => isToday(o.data_hora));
  const ocorrenciasOntem = (ocorrencias.data ?? []).filter((o) => isYesterday(o.data_hora));

  const chamadosPendentes = (chamados.data ?? []).filter((c) => c.status === "pendente");
  const chamadosAndamento = (chamados.data ?? []).filter((c) => c.status === "em_andamento");
  const chamadosConcluidos = (chamados.data ?? []).filter((c) => c.status === "concluido").slice(0, 5);

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do dia — {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
      </div>

      {/* Mural de orientações aos operadores */}
      <OrientacoesMural />

      {/* Solicitações priorizadas para o plantão */}
      <SolicitacoesResumo />

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Avisos urgentes" value={avisosUrgentes.length} icon={Bell} tone="destructive" to="/avisos" />
        <StatCard label="Eventos hoje" value={eventosHoje.length} icon={PartyPopper} tone="primary" to="/eventos" />
        <StatCard label="Mudanças hoje" value={mudancasHoje.length} icon={Truck} tone="primary" to="/mudancas" />
        <StatCard label="Ocorrências hoje" value={ocorrenciasHoje.length} icon={AlertTriangle} tone="warning" to="/ocorrencias" />
        <StatCard label="Chamados pendentes" value={chamadosPendentes.length} icon={Wrench} tone="destructive" to="/chamados" />
      </div>

      {/* Avisos urgentes (topo) */}
      {avisosUrgentes.length > 0 && (
        <div
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-destructive" />
            <h3 className="font-semibold text-destructive">Avisos urgentes</h3>
          </div>
          <div className="space-y-1">
            {avisosUrgentes.slice(0, 5).map((a) => (
              <Row
                key={a.id}
                item={{
                  id: a.id,
                  title: `${a.fixado ? "📌 " : ""}${a.titulo ?? a.descricao}`,
                  subtitle: `${a.condominios?.nome ?? ""}${a.unidades ? ` · Bloco ${a.unidades.blocos?.nome} / Unidade ${a.unidades.numero}` : ""}`,
                  meta: fmtDate(a.data),
                  badge: { label: "Urgente", tone: "destructive" },
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Avisos do dia" icon={Bell} count={avisosHoje.length} to="/avisos" accent="primary">
          {avisosHoje.length === 0 ? (
            <Empty>Nenhum aviso para hoje</Empty>
          ) : (
            avisosHoje.slice(0, 5).map((a) => {
              const tone: "destructive" | "warning" | "primary" =
                a.tipo === "urgente"
                  ? "destructive"
                  : a.tipo === "manutencao"
                    ? "warning"
                    : "primary";
              const tipoLabel =
                a.tipo === "urgente"
                  ? "Urgente"
                  : a.tipo === "manutencao"
                    ? "Manutenção"
                    : "Informativo";
              return (
                <Row
                  key={a.id}
                  item={{
                    id: a.id,
                    title: `${a.fixado ? "📌 " : ""}${a.titulo ?? a.descricao}`,
                    subtitle: a.condominios?.nome ?? "",
                    badge: { label: tipoLabel, tone },
                  }}
                />
              );
            })
          )}
        </SectionCard>

        <SectionCard title="Eventos do dia" icon={PartyPopper} count={eventosHoje.length} to="/eventos" accent="success">
          {eventosHoje.length === 0 ? (
            <Empty>Sem eventos hoje.</Empty>
          ) : (
            eventosHoje.map((e) => (
              <Row
                key={e.id}
                item={{
                  id: e.id,
                  title: e.titulo ?? e.descricao ?? "Evento",
                  subtitle: `${e.condominios?.nome ?? ""}${e.unidades ? ` · Bloco ${e.unidades.blocos?.nome} / Unidade ${e.unidades.numero}` : ""}${e.local ? ` · ${e.local}` : ""}`,
                  meta: e.horario ? `${fmtDate(e.data)} ${String(e.horario).slice(0,5)}` : fmtDate(e.data),
                }}
              />
            ))
          )}
        </SectionCard>

        <SectionCard title="Mudanças do dia" icon={Truck} count={mudancasHoje.length} to="/mudancas" accent="primary">
          {mudancasHoje.length === 0 ? (
            <Empty>Nenhuma mudança hoje.</Empty>
          ) : (
            mudancasHoje.map((m) => (
              <Row
                key={m.id}
                item={{
                  id: m.id,
                  title: `${m.tipo === "entrada" ? "Entrada" : "Saída"} — ${m.condominios?.nome ?? ""}`,
                  subtitle: `Bloco ${m.unidades?.blocos?.nome} / Unidade ${m.unidades?.numero}`,
                  badge: { label: m.tipo, tone: m.tipo === "entrada" ? "success" : "warning" },
                }}
              />
            ))
          )}
        </SectionCard>

        <SectionCard title="Ocorrências de hoje" icon={AlertTriangle} count={ocorrenciasHoje.length} to="/ocorrencias" accent="warning">
          {ocorrenciasHoje.length === 0 ? (
            <Empty>Nenhuma ocorrência hoje.</Empty>
          ) : (
            ocorrenciasHoje.slice(0, 5).map((o) => (
              <Row
                key={o.id}
                item={{
                  id: o.id,
                  title: `${o.tipo} — ${o.condominios?.nome ?? ""}`,
                  subtitle: o.descricao,
                  meta: fmtDateTime(o.data_hora),
                }}
              />
            ))
          )}
        </SectionCard>

        <SectionCard title="Ocorrências de ontem" icon={AlertTriangle} count={ocorrenciasOntem.length} to="/ocorrencias" accent="warning">
          {ocorrenciasOntem.length === 0 ? (
            <Empty>Sem ocorrências ontem.</Empty>
          ) : (
            ocorrenciasOntem.slice(0, 5).map((o) => (
              <Row
                key={o.id}
                item={{
                  id: o.id,
                  title: `${o.tipo} — ${o.condominios?.nome ?? ""}`,
                  subtitle: o.descricao,
                  meta: fmtDateTime(o.data_hora),
                }}
              />
            ))
          )}
        </SectionCard>

        <SectionCard title="Próximos eventos & mudanças" icon={Clock} count={eventosFuturos.length + mudancasFuturas.length} to="/eventos" accent="primary">
          {eventosFuturos.length + mudancasFuturas.length === 0 ? (
            <Empty>Nada agendado.</Empty>
          ) : (
            <>
              {eventosFuturos.map((e) => (
                <Row
                  key={`e-${e.id}`}
                  item={{
                    id: e.id,
                    title: `Evento — ${e.titulo ?? e.descricao ?? ""}`,
                    subtitle: `${e.condominios?.nome ?? ""}${e.unidades ? ` · Unidade ${e.unidades.numero}` : ""}`,
                    meta: fmtDate(e.data),
                  }}
                />
              ))}
              {mudancasFuturas.map((m) => (
                <Row
                  key={`m-${m.id}`}
                  item={{
                    id: m.id,
                    title: `Mudança ${m.tipo === "entrada" ? "(entrada)" : "(saída)"}`,
                    subtitle: `${m.condominios?.nome} · Unidade ${m.unidades?.numero}`,
                    meta: fmtDate(m.data),
                  }}
                />
              ))}
            </>
          )}
        </SectionCard>
      </div>

      {/* Chamados resumo */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Chamados técnicos</h3>
          </div>
          <Link to="/chamados" className="text-xs font-medium text-primary hover:underline">Ver tudo</Link>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg p-3 bg-destructive/10 text-destructive">
            <div className="text-xs">Pendentes</div>
            <div className="text-2xl font-bold">{chamadosPendentes.length}</div>
          </div>
          <div className="rounded-lg p-3 bg-warning/15 text-warning-foreground">
            <div className="text-xs">Em andamento</div>
            <div className="text-2xl font-bold">{chamadosAndamento.length}</div>
          </div>
          <div className="rounded-lg p-3 bg-success/15 text-success">
            <div className="text-xs">Concluídos</div>
            <div className="text-2xl font-bold">{chamadosConcluidos.length}</div>
          </div>
        </div>
        <div className="space-y-1">
          {chamadosPendentes.slice(0, 3).map((c) => (
            <Row
              key={c.id}
              item={{
                id: c.id,
                title: `${c.categoria} — ${c.condominios?.nome ?? ""}`,
                subtitle: c.descricao,
                meta: fmtDateTime(c.data_abertura),
                badge: { label: "Pendente", tone: "destructive" },
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
