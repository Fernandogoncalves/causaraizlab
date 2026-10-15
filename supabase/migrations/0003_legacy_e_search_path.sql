-- Causa Raiz Lab — registro das alterações aplicadas em 15/10/2026 no projeto causaraizlabdb.
-- Já aplicado no banco; mantido aqui para histórico.

-- 1) O esquema de testes anterior foi movido (não apagado) para o schema legacy.
--    Os dados (2 análises, 5 causas, 3 hipóteses, 2 riscos, 2 ações, 4 medições) foram preservados.
--    Para remover de vez no futuro: drop schema legacy cascade;
create schema if not exists legacy;
alter table public.medicoes  set schema legacy;
alter table public.acoes     set schema legacy;
alter table public.riscos    set schema legacy;
alter table public.hipoteses set schema legacy;
alter table public.causas    set schema legacy;
alter table public.analises  set schema legacy;

-- 2) Fixa o search_path das funções de trigger (aviso do advisor de segurança).
alter function public.garantir_causa_validada() set search_path = public;
alter function public.impedir_regressao_causa() set search_path = public;
