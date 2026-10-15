import type { Metadata } from "next";
import Link from "next/link";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
              </Link>
            ))}
          </nav>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
