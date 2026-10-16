"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/** Troca a análise e já recarrega o diagrama, sem botão de confirmação. */
export function SeletorAnalise({
  analises,
  selecionadaId,
}: {
  analises: { id: string; titulo: string }[];
  selecionadaId: string;
}) {
  const router = useRouter();

  return (
    <div className="seletor">
      <label htmlFor="analise" className="rotulo">
        Análise
      </label>
      <select
        id="analise"
        value={selecionadaId}
        onChange={(e) => router.push(`/diagrama?analise=${encodeURIComponent(e.target.value)}`)}
      >
        {analises.map((a) => (
          <option key={a.id} value={a.id}>
            {a.titulo}
          </option>
        ))}
      </select>
      <Link href={`/analises/${selecionadaId}`} className="muted">
        Ver detalhes →
      </Link>
    </div>
  );
}
