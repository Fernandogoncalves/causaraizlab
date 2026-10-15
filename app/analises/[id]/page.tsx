import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

type Analise = {
  id: string;
  titulo: string;
  indicador: string;
  periodo_inicio: string;
  periodo_fim: string;
  baseline: number;
  meta: number;
  efeito: string | null;
};

type Hipotese = {
  id: string;
  dimensao: string;
  descricao: string;
  pai_id: string | null;
  status: "hipotese" | "validada" | "descartada";
  impacto: number | null;
  viabilidade: number | null;
};

const dimensoes: Record<string, string> = {
  pessoas: "Pessoas",
  processo: "Processo",
  ferramentas: "Ferramentas",
  dados: "Dados",
  dependencias: "Dependências",
  politicas: "Políticas",
  ambiente: "Ambiente",
};

const rotulosStatus: Record<Hipotese["status"], string> = {
  hipotese: "Em aberto",
  validada: "Validada",
  descartada: "Descartada",
};

const formatarPeriodo = (inicio: string, fim: string) => {
  const f = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR");
  return `${f(inicio)} a ${f(fim)}`;
};

function NoHipotese({
  hipotese,
  filhos,
  evidencias,
}: {
  hipotese: Hipotese;
  filhos: Map<string, Hipotese[]>;
  evidencias: Map<string, number>;
}) {
  const subcausas = filhos.get(hipotese.id) ?? [];
  const qtdEvidencias = evidencias.get(hipotese.id) ?? 0;

  return (
    <li className="no">
      <div className={`card hipotese status-${hipotese.status}`}>
        <div className="cabeca-hipotese">
          <span className="chip">{dimensoes[hipotese.dimensao] ?? hipotese.dimensao}</span>
          <span className={`badge badge-${hipotese.status}`}>{rotulosStatus[hipotese.status]}</span>
        </div>
        <p className="descricao">{hipotese.descricao}</p>
        <p className="muted">
          Impacto {hipotese.impacto ?? "—"} · Viabilidade {hipotese.viabilidade ?? "—"} ·{" "}
          {qtdEvidencias} evidência{qtdEvidencias === 1 ? "" : "s"}
        </p>
      </div>
      {subcausas.length > 0 && (
        <ul className="subcausas">
          {subcausas.map((s) => (
            <NoHipotese key={s.id} hipotese={s} filhos={filhos} evidencias={evidencias} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default async function DetalheAnalise({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient(await cookies());

  const { data: analiseData, error: erroAnalise } = await supabase
    .from("analises")
    .select("id, titulo, indicador, periodo_inicio, periodo_fim, baseline, meta, efeito")
    .eq("id", id)
    .maybeSingle();

  if (erroAnalise) {
    return (
      <p role="alert" className="erro">
        Não foi possível carregar a análise: {erroAnalise.message}
      </p>
    );
  }
  if (!analiseData) notFound();

  const analise = analiseData as Analise;

  const { data: hipData } = await supabase
    .from("hipoteses")
    .select("id, dimensao, descricao, pai_id, status, impacto, viabilidade")
    .eq("analise_id", id)
    .order("criado_em");

  const hipoteses = (hipData ?? []) as Hipotese[];
  const idsHipoteses = hipoteses.map((h) => h.id);

  const { data: evData } = idsHipoteses.length
    ? await supabase.from("evidencias").select("hipotese_id").in("hipotese_id", idsHipoteses)
    : { data: [] as { hipotese_id: string }[] };

  const evidencias = new Map<string, number>();
  for (const e of evData ?? []) {
    evidencias.set(e.hipotese_id, (evidencias.get(e.hipotese_id) ?? 0) + 1);
  }

  // Árvore: raízes são hipóteses sem pai; filhos agrupados pelo pai_id.
  const filhos = new Map<string, Hipotese[]>();
  for (const h of hipoteses) {
    if (h.pai_id) filhos.set(h.pai_id, [...(filhos.get(h.pai_id) ?? []), h]);
  }
  const raizes = hipoteses.filter((h) => !h.pai_id);

  return (
    <>
      <p className="muted">
        <Link href="/analises">← Análises</Link>
      </p>
      <h1>{analise.titulo}</h1>
      <p className="muted">
        {analise.indicador} · baseline {analise.baseline} → meta {analise.meta} ·{" "}
        {formatarPeriodo(analise.periodo_inicio, analise.periodo_fim)}
      </p>
      {analise.efeito && (
        <div className="card efeito-card">
          <span className="rotulo">Efeito observado</span>
          <p>{analise.efeito}</p>
        </div>
      )}

      <h2 style={{ marginTop: "2rem" }}>Causas e hipóteses</h2>
      {hipoteses.length === 0 ? (
        <div className="empty">Nenhuma hipótese registrada para esta análise.</div>
      ) : (
        <ul className="arvore">
          {raizes.map((h) => (
            <NoHipotese key={h.id} hipotese={h} filhos={filhos} evidencias={evidencias} />
          ))}
        </ul>
      )}
    </>
  );
}
