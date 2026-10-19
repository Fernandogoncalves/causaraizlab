import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { sair } from "@/app/actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "Causa Raiz Lab",
  description: "Análise de causa raiz (Ishikawa) para times ágeis.",
};

const abas = [
  { href: "/", rotulo: "Dashboard" },
  { href: "/analises", rotulo: "Análises" },
  { href: "/diagrama", rotulo: "Diagrama" },
  { href: "/riscos", rotulo: "Riscos" },
  { href: "/plano", rotulo: "Plano de Ação" },
];

async function contarRiscosAbertos() {
  try {
    const supabase = createClient(await cookies());
    const { count } = await supabase
      .from("riscos")
      .select("id", { count: "exact", head: true })
      .eq("status", "aberto");
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const riscosAbertos = await contarRiscosAbertos();

  return (
    <html lang="pt-BR">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            causa<span>/</span>raiz.lab
          </Link>
          <nav className="nav" aria-label="Abas do app">
            {abas.map((aba) => (
              <Link key={aba.href} href={aba.href}>
                {aba.rotulo}
                {aba.href === "/riscos" && riscosAbertos > 0 && (
                  <span className="nav-badge">{riscosAbertos}</span>
                )}
              </Link>
            ))}
          </nav>
          <form action={sair}>
            <button type="submit" className="botao-secundario botao-sair">
              Sair
            </button>
          </form>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
