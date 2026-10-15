-- Causa Raiz Lab — esquema inicial (RASCUNHO).
-- Premissa central: uma ação só pode existir sobre uma causa VALIDADA.
-- Isso é garantido pelo banco (trigger), não só pela aplicação.
-- Revisar com o artifact da aula antes de aplicar em produção.

create extension if not exists "pgcrypto";

-- Dimensões do diagrama (rótulos de times ágeis — a confirmar com a aula)
create type dimensao as enum (
  'pessoas', 'processo', 'ferramentas', 'dados',
  'dependencias', 'politicas', 'ambiente'
);

create type status_hipotese as enum ('hipotese', 'validada', 'descartada');
create type status_acao as enum ('planejada', 'em_andamento', 'concluida', 'cancelada');

create table analises (
  id               uuid primary key default gen_random_uuid(),
  titulo           text not null,
  indicador        text not null,
  periodo_inicio   date not null,
  periodo_fim      date not null,
  baseline         numeric not null,
  meta             numeric not null,
  efeito           text,                      -- descrição do desvio observado
  criado_em        timestamptz not null default now(),
  check (periodo_fim >= periodo_inicio)
);

create table hipoteses (
  id            uuid primary key default gen_random_uuid(),
  analise_id    uuid not null references analises(id) on delete cascade,
  dimensao      dimensao not null,
  descricao     text not null,
  pai_id        uuid references hipoteses(id) on delete cascade, -- 5 Porquês / subcausas
  status        status_hipotese not null default 'hipotese',
  impacto       smallint check (impacto between 1 and 5),
  viabilidade   smallint check (viabilidade between 1 and 5),
  criado_em     timestamptz not null default now()
);

create table evidencias (
  id            uuid primary key default gen_random_uuid(),
  hipotese_id   uuid not null references hipoteses(id) on delete cascade,
  descricao     text not null,
  fonte         text,                          -- link, ticket, métrica
  criado_em     timestamptz not null default now()
);

create table acoes (
  id              uuid primary key default gen_random_uuid(),
  analise_id      uuid not null references analises(id) on delete cascade,
  causa_id        uuid not null references hipoteses(id) on delete restrict,
  -- 5W2H
  o_que           text not null,
  por_que         text,
  onde            text,
  quando          date,
  quem            text,
  como            text,
  quanto          numeric,
  status          status_acao not null default 'planejada',
  resultado_medido numeric,                    -- medição depois da ação
  criado_em       timestamptz not null default now()
);

-- Garante: a causa de uma ação precisa estar validada e pertencer à mesma análise.
create or replace function garantir_causa_validada() returns trigger
language plpgsql as $$
declare
  v_status status_hipotese;
  v_analise uuid;
begin
  select status, analise_id into v_status, v_analise
    from hipoteses where id = new.causa_id;

  if v_status is distinct from 'validada' then
    raise exception 'Ação só pode apontar para causa validada (status atual: %)', v_status;
  end if;

  if v_analise <> new.analise_id then
    raise exception 'Causa pertence a outra análise.';
  end if;

  return new;
end;
$$;

create trigger acoes_causa_validada
  before insert or update of causa_id, analise_id on acoes
  for each row execute function garantir_causa_validada();

-- Impede que uma causa com ações vinculadas volte a ser "hipótese" ou seja descartada.
create or replace function impedir_regressao_causa() returns trigger
language plpgsql as $$
begin
  if old.status = 'validada' and new.status <> 'validada'
     and exists (select 1 from acoes where causa_id = old.id) then
    raise exception 'Causa com ações vinculadas não pode deixar de ser validada.';
  end if;
  return new;
end;
$$;

create trigger hipoteses_regressao
  before update of status on hipoteses
  for each row execute function impedir_regressao_causa();

-- Row Level Security: habilitado. Políticas por time serão definidas quando o modelo de acesso for confirmado.
alter table analises   enable row level security;
alter table hipoteses  enable row level security;
alter table evidencias enable row level security;
alter table acoes      enable row level security;
