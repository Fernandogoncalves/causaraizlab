# Causa Raiz Lab

App web de análise de causa raiz (Ishikawa) para times ágeis: causa e efeito com evidências, análise de riscos, plano de ação e dashboard de antes e depois.

**Stack:** Next.js 15 (App Router) · Postgres no Supabase (SQL puro + RLS) · Vercel · Neon como banco de preview (planejado).

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencher NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

## Estrutura

| Caminho | Conteúdo |
|---|---|
| `app/` | Abas: Dashboard, Análises, Diagrama, Riscos, Plano de Ação |
| `utils/supabase/` | Clientes Supabase (servidor, navegador e middleware) |
| `supabase/migrations/` | Esquema SQL (rascunho, revisar antes de aplicar) |

## Regra central

Uma ação só pode apontar para uma causa com status `validada` da mesma análise. A regra é imposta por trigger no banco.

## Status

Estrutura inicial. Telas com dados ainda são placeholders. O esquema é um rascunho pendente de conferência com o material da aula.
