import Link from "next/link";
import { cookies } from "next/headers";
import { mudarStatusAcao } from "@/app/actions";
import { createClient } from "@/utils/supabase/server";
import { ROTULO_ACAO, STATUS_ACAO, formatarData, type StatusAcao } from "@/lib/dominios";

type AcaoPlano = {
  id: string;
  analise_id: string;
  causa_id: string;
  o_que: string;
  quem: string | null;
  onde: string | null;
  quando: string | null;
  quanto: number | null;
  status: StatusAcao;
  analises: { titulo: string } | null;
  hipoteses: { descricao: string } | null;
};

const hoje = () => new Date().toISOString().slice(0, 10);

export default async function PlanoDeAcao() {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("acoes")
    .select(
      "id, analise_id, causa_id, o_que, quem, onde, quando, quanto, status, analises(titulo), hipoteses(descricao)",
    )
    .order("quando", { ascending: true, nullsFirst: false });

  if (error) {
    return (
      <>
        <h1>Plano de ação</h1>
        <p role="alert" className="erro">
          Não foi possível carregar o plano: {error.message}
        </p>
      </>
    );
  }

  const acoes = (data ?? []) as unknown as AcaoPlano[];
  const abertas = acoes.filter((a) => a.status === "planejada" || a.status === "em_andamento");
  const atrasadas = abertas.filter((a) => a.quando && a.quando < hoje());

  return (
    <>
      <h1>Plano de ação</h1>
      <p className="muted">
        Ações atacam causas validadas. Cada item indica o que, quem, onde e até quando.
      </p>

      <div className="grade-resumo" style={{ marginTop: "1.25rem" }}>
        <div className="card">
          <span className="numero">{abertas.length}</span>
          <span className="muted">Em aberto</span>
        </div>
        <div className="card">
          <span className={`numero ${atrasadas.length ? "numero-alerta" : ""}`}>{atrasadas.length}</span>
          <span className="muted">Atrasadas</span>
        </div>
        <div className="card">
          <span className="numero">{acoes.filter((a) => a.status === "concluida").length}</span>
          <span className="muted">Concluídas</span>
        </div>
      </div>

      {acoes.length === 0 ? (
        <div className="empty" style={{ marginTop: "1.5rem" }}>
          Nenhuma ação cadastrada. Crie uma pela tela de uma análise, sobre uma causa validada.
        </div>
      ) : (
        <div className="tabela-acoes">
          <table>
            <thead>
              <tr>
                <th>Ação</th>
                <th>Análise</th>
                <th>Causa</th>
                <th>Responsável</th>
                <th>Prazo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {acoes.map((a) => {
                const atrasada = (a.status === "planejada" || a.status === "em_andamento") && a.quando && a.quando < hoje();
                return (
                  <tr key={a.id}>
                    <td>{a.o_que}</td>
                    <td>
                      <Link href={`/analises/${a.analise_id}`}>{a.analises?.titulo ?? "—"}</Link>
                    </td>
                    <td className="muted">{a.hipoteses?.descricao ?? "—"}</td>
                    <td>{a.quem ?? "—"}</td>
                    <td className={atrasada ? "texto-alerta" : ""}>
                      {a.quando ? formatarData(a.quando) : "—"}
                    </td>
                    <td>
                      <form action={mudarStatusAcao.bind(null, a.analise_id, a.id)} className="inline">
                        <input type="hidden" name="destino" value="/plano" />
                        <select name="status" defaultValue={a.status} aria-label="Status da ação">
                          {STATUS_ACAO.map((s) => (
                            <option key={s} value={s}>
                              {ROTULO_ACAO[s]}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="botao-secundario">
                          Salvar
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
