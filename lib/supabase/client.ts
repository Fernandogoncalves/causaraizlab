import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase para componentes do navegador (usa a anon key + RLS). */
export function criarClienteNavegador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !chave) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return createBrowserClient(url, chave);
}
