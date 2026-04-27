# CHANGELOG_SISTEMA

Registro oficial de mudanças relevantes do sistema.
Cada entrada deve conter: **Data**, **O que foi alterado**, **Quem alterou** e **Impacto**.

---

## Como registrar uma nova mudança

Adicione uma nova entrada no topo do histórico, seguindo o modelo:

```md
### YYYY-MM-DD — <Título curto da mudança>
- **Data:** YYYY-MM-DD
- **Alterado por:** <Nome / e-mail / equipe>
- **O que foi alterado:**
  - Item 1
  - Item 2
- **Impacto:**
  - Quem é afetado (admin, operador, síndico, todos)
  - Áreas do sistema impactadas
  - Riscos / pontos de atenção
- **Referência:** <link, PR, migration, snapshot, etc. — opcional>
```

> Convenções:
> - Datas em **ISO (YYYY-MM-DD)**
> - Mudanças mais recentes **no topo**
> - Sempre apontar a migration ou snapshot relacionado quando houver

---

## Histórico

### 2026-04-27 — Snapshot estável V1 do banco
- **Data:** 2026-04-27
- **Alterado por:** Lovable (a pedido do administrador)
- **O que foi alterado:**
  - Gerado snapshot completo do schema `public` (estrutura + dados + RLS + triggers + funções)
  - Arquivos salvos em `/mnt/documents/SNAPSHOT_V1_ESTAVEL/` e empacotados em `SNAPSHOT_V1_ESTAVEL.zip`
- **Impacto:**
  - Nenhum impacto operacional — apenas backup
  - Permite restauração completa caso alguma alteração futura quebre o sistema
- **Referência:** `SNAPSHOT_V1_ESTAVEL.zip`

### 2026-04-27 — Padronização do label "Operador"
- **Data:** 2026-04-27
- **Alterado por:** Lovable
- **O que foi alterado:**
  - Substituído o texto "Operador / Porteiro" por "Operador" nos dropdowns de criação e edição de usuário (`src/routes/usuarios.tsx`)
- **Impacto:**
  - Apenas visual — valor interno (`operador`) inalterado
  - Sem mudança no banco, sem impacto em permissões

### 2026-04-27 — Validação do controle de acesso da guia "Usuários"
- **Data:** 2026-04-27
- **Alterado por:** Lovable
- **O que foi alterado:**
  - Auditadas as três camadas de proteção da rota `/usuarios`: menu (`AppShell`), rota (`RequireAuth` + redirect para não-admins) e backend (edge function `admin-users` valida role admin)
  - Nenhum código alterado — proteção já estava correta
- **Impacto:**
  - Confirmação de que apenas administradores acessam a gestão de usuários

### 2026-04-27 — Padronização visual de Avisos ativos no Dashboard
- **Data:** 2026-04-27
- **Alterado por:** Lovable
- **O que foi alterado:**
  - Filtro temporal: exibe apenas avisos cuja data atual está dentro do período (`data_inicio` a `data_expiracao`)
  - Ordenação: em andamento primeiro, depois futuros próximos
  - Card refeito com `DateBadge` (HOJE / AMANHÃ / data) como destaque principal
- **Impacto:**
  - Apenas frontend — operador identifica avisos ativos com mais rapidez
  - Avisos expirados desaparecem automaticamente do dashboard

### 2026-04-27 — Padronização dos cards de Ocorrências e Solicitações
- **Data:** 2026-04-27
- **Alterado por:** Lovable
- **O que foi alterado:**
  - Hierarquia única em ambos: Condomínio (negrito) → Unidade/Bloco → Data/hora → Status (badge) → Descrição
  - Removido o destaque do tipo como título principal
- **Impacto:**
  - Apenas frontend — leitura mais rápida e padrão visual consistente

### 2026-04-27 — Date badges em Eventos e Mudanças
- **Data:** 2026-04-27
- **Alterado por:** Lovable
- **O que foi alterado:**
  - Criado componente `DateBadge` (HOJE / AMANHÃ / ATRASADO / data)
  - Aplicado nos cards de Eventos e Mudanças do dashboard
- **Impacto:**
  - Apenas frontend — destaque imediato do que ocorre hoje/amanhã

### 2026-04-27 — Módulo completo de Chamados Técnicos
- **Data:** 2026-04-27
- **Alterado por:** Lovable
- **O que foi alterado:**
  - Criada tabela `chamados_tecnicos` com RLS (admin/operador gerenciam, autenticados visualizam)
  - Trigger `set_chamado_finalizado` para preencher `finalizado_em`/`data_conclusao` automaticamente
  - UI: `ChamadosManager`, rotas `/chamados` e `/chamados/novo`, resumo no dashboard
  - Integração com `audit_log`
- **Impacto:**
  - Nova funcionalidade operacional disponível para admin e operador
  - Síndico apenas visualiza
- **Referência:** migrations `20260427154956_*` e `20260427155023_*`

### 2026-04-27 — Reorganização do Dashboard
- **Data:** 2026-04-27
- **Alterado por:** Lovable
- **O que foi alterado:**
  - Nova ordem operacional: Eventos → Mudanças → Ocorrências → Solicitações → Avisos → Chamados → Orientações
  - Todas as seções padronizadas em grid de 4 cards, com botão "Ver tudo"
  - Criados componentes de resumo: `AvisosResumo`, `ChamadosResumo`, `MudancasResumo`, `OcorrenciasResumo`
- **Impacto:**
  - Apenas frontend — lógica e dados preservados
  - Dashboard mais escaneável e consistente

---

## Snapshot de referência

| Snapshot | Data | Arquivo |
|---|---|---|
| V1 — estado estável | 2026-04-27 | `SNAPSHOT_V1_ESTAVEL.zip` |