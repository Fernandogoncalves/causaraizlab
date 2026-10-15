-- Resultado medido do indicador após as ações (base do comparativo antes × depois).
-- Nullable: análises sem medição continuam válidas.
alter table analises add column if not exists resultado_medido numeric;
