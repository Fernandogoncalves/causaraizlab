import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { formatarPeriodo } from "@/lib/dominios";

type Analise = {
  id: string;
  titulo: string;
  indicador: string;
  periodo_inicio: string;
  periodo_fim: string;
  baseline: number;
  meta: number;
  resultado_medido: number | null;
};
type Hip = { analise_id: string; status: string };
type Acao = { analise_id: string; status: string; quando: string | null };
type Risco = { analise_id: string; probabilidade: number; severidade: number; status: string };

const hoje = () => new Date().toISOString().slice(0, 10);

const pct = (parte: number, total: number) => (total === 0 ? 0 : Math.round((parte * 100) / total));

/** Quanto do caminho entre baseline e meta foi percorrido pelo resultado medido. */
const pctMeta = (a: { baseline: number; meta: number; resultado_medido: number | null }) =>
  a.resultado_medido === null || a.meta === a.baseline
    ? 0
    : Math.round(((a.resultado_medido - a.baseline) * 100) / (a.meta - a.baseline));

export default async function Dashboard() {
  const supabase = createClient(await cookies());

  const [analisesR, hipR, acoesR, riscosR] = await Promise.all([
    supabase
      .from("analises")
      .select("id, titulo, indicador, periodo_inicio, periodo_fim, baseline, meta, resultado_medido")
      .order("titulo"),
    supabase.from("hipoteses").select("analise_id, status"),
    supabase.from("acoes").select("analise_id, status, quando"),
    supabase.from("riscos").select("analise_id, probabilidade, severidade, status"),
  ]);

  const erro = analisesR.error ?? hipR.error ?? acoesR.error ?? riscosR.error;
  if (erro) {
    return (
      <>
        <h1>Dashboard</h1>
        <p role="alert" className="erro">
          Não foi possível carregar os dados: {erro.message}
        </p>
      </>
    );
  }

  const analises = (analisesR.data ?? []) as Analise[];
  const hips = (hipR.data ?? []) as Hip[];
  const acoes = (acoesR.data ?? []) as Acao[];
  const riscos = (riscosR.data ?? []) as Risco[];

  if (analises.length === 0) {
    return (
      <>
        <h1>Dashboard gerencial</h1>
        <div className="empty" style={{ marginTop: "1.5rem" }}>
          Ainda não há análises. <Link href="/analises/nova">Crie a primeira</Link>.
        </div>
      </>
    );
  }

  const validadas = hips.filter((h) => h.status === "validada").length;
  const atrasadas = acoes.filter(
    (a) => (a.status === "planejada" || a.status === "em_andamento") && a.quando && a.quando < hoje(),
  ).length;
  const riscosAltos = riscos.filter(
    (r) => r.probabilidade * r.severidade >= 15 && r.status === "aberto",
  ).length;
  const ativas = analises.length;

  const porAnalise = analises.map((a) => {
    const h = hips.filter((x) => x.analise_id === a.id);
    const ac = acoes.filter((x) => x.analise_id === a.id);
    const concluidas = ac.filter((x) => x.status === "concluida").length;
    return {
      ...a,
      hipoteses: h.length,
      validadas: h.filter((x) => x.status === "validada").length,
      acoes: ac.length,
      concluidas,
      progresso: pct(concluidas, ac.length),
    };
  });

  const medidas = analises.filter((a) => a.resultado_medido !== null && a.meta !== a.baseline);

  return (
    <>
      <h1>Dashboard gerencial</h1>
      <p className="muted">
        O que os dados dizem sobre o fluxo, antes das opiniões. Efeito observado não comprova causalidade.
      </p>

      <div className="grade-resumo" style={{ marginTop: "1.25rem" }}>
        <div className="card">
          <span className="numero">{ativas}</span>
          <span className="muted">Análises</span>
        </div>
        <div className="card">
          <span className="numero">{pct(validadas, hips.length)}%</span>
          <span className="muted">
            Hipóteses validadas ({validadas} de {hips.length})
          </span>
        </div>
        <div className="card">
          <span className={`numero ${atrasadas ? "numero-alerta" : ""}`}>{atrasadas}</span>
          <span className="muted">Ações atrasadas</span>
        </div>
        <div className="card">
          <span className={`numero ${riscosAltos ? "numero-alerta" : ""}`}>{riscosAltos}</span>
          <span className="muted">Riscos abertos de exposição alta</span>
        </div>
      </div>

      <h2 style={{ marginTop: "2.5rem" }}>Portfólio de análises</h2>
      <div className="tabela-acoes">
        <table>
          <thead>
            <tr>
              <th>Análise</th>
              <th>Indicador</th>
              <th>Baseline → meta</th>
              <th>Período</th>
              <th>Hipóteses validadas</th>
              <th>Avanço das ações</th>
            </tr>
          </thead>
          <tbody>
            {porAnalise.map((a) => (
              <tr key={a.id}>
                <td>
                  <Link href={`/analises/${a.id}`}>{a.titulo}</Link>
                </td>
                <td className="muted">{a.indicador}</td>
                <td className="mono">
                  {a.baseline} → {a.meta}
                </td>
                <td className="muted">{formatarPeriodo(a.periodo_inicio, a.periodo_fim)}</td>
                <td>
                  {a.validadas} de {a.hipoteses}
                </td>
                <td>
                  {a.acoes === 0 ? (
                    <span className="muted">Sem ações</span>
                  ) : (
                    <div className="progresso" aria-label={`${a.progresso}% concluído`}>
                      <div className="progresso-barra" style={{ width: `${a.progresso}%` }} />
                      <span>
                        {a.concluidas}/{a.acoes} · {a.progresso}%
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginTop: "2.5rem" }}>Antes × depois</h2>
      {medidas.length === 0 ? (
        <div className="empty">
          Nenhuma análise tem resultado medido ainda. Preencha o campo “Resultado medido” em{" "}
          <Link href="/analises">uma análise</Link> para ver o comparativo.
        </div>
      ) : (
        <div className="tabela-acoes">
          <table>
            <thead>
              <tr>
                <th>Análise</th>
                <th>Indicador</th>
                <th>Antes (baseline)</th>
                <th>Depois (medido)</th>
                <th>Meta</th>
                <th>Meta atingida</th>
              </tr>
            </thead>
            <tbody>
              {medidas.map((a) => {
                const atingida = pctMeta(a);
                return (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/analises/${a.id}`}>{a.titulo}</Link>
                    </td>
                    <td className="muted">{a.indicador}</td>
                    <td className="mono">{a.baseline}</td>
                    <td className="mono">{a.resultado_medido}</td>
                    <td className="mono">{a.meta}</td>
                    <td>
                      <div className="progresso" aria-label={`${atingida}% da meta atingida`}>
                        <div className="progresso-barra" style={{ width: `${Math.min(Math.max(atingida, 0), 100)}%` }} />
                        <span>{atingida}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted" style={{ fontSize: "0.85rem", marginTop: "0.6rem" }}>
        Meta atingida = (depois − antes) ÷ (meta − antes). Valores acima de 100% superam a meta; negativos indicam piora.
      </p>
    </>
  );
}
