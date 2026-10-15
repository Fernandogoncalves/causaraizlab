-- Riscos ligados a uma análise (matriz probabilidade × severidade).
-- Já aplicada no projeto como "tabela_riscos"; este arquivo registra a mesma definição.

create type status_risco as enum ('aberto', 'mitigado', 'aceito', 'fechado');
create type resposta_risco as enum ('mitigar', 'aceitar', 'transferir', 'evitar');

create table riscos (
  id            uuid primary key default gen_random_uuid(),
  analise_id    uuid not null references analises(id) on delete cascade,
  hipotese_id   uuid references hipoteses(id) on delete set null,
  descricao     text not null,
  probabilidade smallint not null check (probabilidade between 1 and 5),
  severidade    smallint not null check (severidade between 1 and 5),
  resposta      resposta_risco not null default 'mitigar',
  gatilho       text,
  dono          text,
  status        status_risco not null default 'aberto',
  criado_em     timestamptz not null default now()
);

alter table riscos enable row level security;

create policy autenticados_leem_riscos
  on riscos for select to authenticated using (true);

create policy autenticados_escrevem_riscos
  on riscos for all to authenticated using (true) with check (true);
