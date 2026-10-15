import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

type AnaliseResumo = {
  id: string;
  titulo: string;
  indicador: string;
  periodo_inicio: string;
  periodo_fim: string;
  baseline: number;
  meta: number;
  efeito: string | null;
  resultado_medido: number | null;
};

type HipResumo = { analise_id: string; status: string };

const formatarPeriodo = (inicio: string, fim: string) => {
  const f = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR");
  return `${f(inicio)} a ${f(fim)}`;
};

export default async function Analises() {
  const supabase = createClient(await cookies());
  const [{ data, error }, { data: hipData }] = await Promise.all([
    supabase
      .from("analises")
      .select("id, titulo, indicador, periodo_inicio, periodo_fim, baseline, meta, resultado_medido, efeito")
      .order("titulo"),
    supabase.from("hipoteses").select("analise_id, status"),
  ]);

  if (error) {
    return (
      <>
        <h1>Análises</h1>
        <p role="alert" className="erro">
          Não foi possível carregar as análises: {error.message}
        </p>
      </>
    );
  }

  const analises = (data ?? []) as AnaliseResumo[];
  const hips = (hipData ?? []) as HipResumo[];

  return (
    <>
      <h1>Análises</h1>
      <p className="muted">
        Problema formulado como desvio observável: indicador, período, baseline e meta.
      </p>
      <p style={{ marginTop: "1rem" }}>
        <Link href="/analises/nova" className="botao-link">
          + Nova análise
        </Link>
      </p>

      {analises.length === 0 ? (
        <div className="empty" style={{ marginTop: "1.5rem" }}>
          Nenhuma análise cadastrada.
        </div>
      ) : (
        <ul className="lista">
          {analises.map((a) => (
            <li key={a.id}>
              <Link href={`/analises/${a.id}`} className="card linha-analise">
                <strong>{a.titulo}</strong>
                <span className="muted">{a.indicador}</span>
                <span className="mono">
                  baseline {a.baseline} → meta {a.meta}
                </span>
                <span className="muted">{formatarPeriodo(a.periodo_inicio, a.periodo_fim)}</span>
                <span className="muted">
                  {(() => {
                    const h = hips.filter((x) => x.analise_id === a.id);
                    const validadas = h.filter((x) => x.status === "validada").length;
                    return h.length === 0
                      ? "Sem hipóteses ainda"
                      : `${h.length} ${h.length === 1 ? "hipótese" : "hipóteses"} · ${validadas} validada${validadas === 1 ? "" : "s"}`;
                  })()}
                  {a.resultado_medido !== null && ` · resultado medido ${a.resultado_medido}`}
                </span>
                {a.efeito && <span className="efeito">{a.efeito}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
