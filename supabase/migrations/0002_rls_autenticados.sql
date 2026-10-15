-- Causa Raiz Lab — políticas de RLS (RASCUNHO, aplicar depois de 0001_init.sql).
-- Regra: somente usuários autenticados (login Supabase) leem e escrevem.
-- A chave publicável (anon), sem login, não acessa nenhuma linha.
-- Isolamento por time exigiria coluna de dono/time e vínculo com usuários; fica para depois.

create policy "autenticados_leem_analises" on analises
  for select to authenticated using (true);
create policy "autenticados_escrevem_analises" on analises
  for all to authenticated using (true) with check (true);

create policy "autenticados_leem_hipoteses" on hipoteses
  for select to authenticated using (true);
create policy "autenticados_escrevem_hipoteses" on hipoteses
  for all to authenticated using (true) with check (true);

create policy "autenticados_leem_evidencias" on evidencias
  for select to authenticated using (true);
create policy "autenticados_escrevem_evidencias" on evidencias
  for all to authenticated using (true) with check (true);

create policy "autenticados_leem_acoes" on acoes
  for select to authenticated using (true);
create policy "autenticados_escrevem_acoes" on acoes
  for all to authenticated using (true) with check (true);
