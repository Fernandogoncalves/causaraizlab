import { cookies } from "next/headers";
import { criarRisco, mudarStatusRisco } from "@/app/actions";
import { createClient } from "@/utils/supabase/server";
import {
  ROTULO_RESPOSTA,
  ROTULO_RISCO,
  RESPOSTAS_RISCO,
  STATUS_RISCO,
  type RespostaRisco,
  type StatusRisco,
} from "@/lib/dominios";

type Analise = { id: string; titulo: string };
type Hipotese = { id: string; descricao: string; status: string };
type Risco = {
  id: string;
  hipotese_id: string | null;
  descricao: string;
  probabilidade: number;
  severidade: number;
  resposta: RespostaRisco;
  gatilho: string | null;
  dono: string | null;
  status: StatusRisco;
};

const exposicao = (r: Risco) => r.probabilidade * r.severidade;

const corExposicao = (e: number) => (e >= 15 ? "alta" : e >= 8 ? "media" : "baixa");

export default async function Riscos({
  searchParams,
}: {
  searchParams: Promise<{ analise?: string; erro?: string }>;
}) {
  const { analise: analiseParam, erro } = await searchParams;
  const supabase = createClient(await cookies());

  const { data: listaData } = await supabase.from("analises").select("id, titulo").order("titulo");
  const analises = (listaData ?? []) as Analise[];

  if (analises.length === 0) {
    return (
      <>
        <h1>Riscos</h1>
        <div className="empty">Cadastre uma análise antes de registrar riscos.</div>
      </>
    );
  }

  const selecionada = analises.find((a) => a.id === analiseParam) ?? analises[0];

  const { data: riscoData } = await supabase
    .from("riscos")
    .select("id, hipotese_id, descricao, probabilidade, severidade, resposta, gatilho, dono, status")
    .eq("analise_id", selecionada.id)
    .order("criado_em");
  const riscos = (riscoData ?? []) as Risco[];

  const { data: hipData } = await supabase
    .from("hipoteses")
    .select("id, descricao, status")
    .eq("analise_id", selecionada.id);
  const hipoteses = (hipData ?? []) as Hipotese[];

  // Matriz 5x5: linhas = severidade (5 no topo), colunas = probabilidade.
  const contagem = new Map<string, number>();
  for (const r of riscos) {
    const chave = `${r.probabilidade}-${r.severidade}`;
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  const linhas = [5, 4, 3, 2, 1];
  const colunas = [1, 2, 3, 4, 5];

  const abertos = riscos.filter((r) => r.status === "aberto");

  return (
    <>
      <h1>Riscos</h1>
      <p className="muted">
        Riscos ligados a uma análise. Exposição = probabilidade × severidade (de 1 a 25).
      </p>

      <form method="get" className="seletor">
        <label htmlFor="analise" className="rotulo">
          Análise
        </label>
        <select id="analise" name="analise" defaultValue={selecionada.id}>
          {analises.map((a) => (
            <option key={a.id} value={a.id}>
              {a.titulo}
            </option>
          ))}
        </select>
        <button type="submit">Ver riscos</button>
      </form>

      {erro && (
        <p role="alert" className="erro" style={{ marginTop: "1rem" }}>
          {erro}
        </p>
      )}

      <div className="grade-resumo" style={{ marginTop: "1.25rem" }}>
        <div className="card">
          <span className="numero">{riscos.length}</span>
          <span className="muted">Riscos registrados</span>
        </div>
        <div className="card">
          <span className="numero">{abertos.length}</span>
          <span className="muted">Abertos</span>
        </div>
        <div className="card">
          <span className="numero numero-alerta">{riscos.filter((r) => exposicao(r) >= 15).length}</span>
          <span className="muted">Exposição alta (≥ 15)</span>
        </div>
      </div>

      <div className="riscos-grade">
        <section>
          <h2>Matriz</h2>
          <div className="matriz" role="table" aria-label="Matriz de probabilidade por severidade">
            <div className="matriz-canto" />
            {colunas.map((p) => (
              <div key={`p${p}`} className="matriz-eixo" role="columnheader">
                P{p}
              </div>
            ))}
            {linhas.map((s) => (
              <div key={`linha${s}`} className="matriz-linha" role="row">
                <div className="matriz-eixo" role="rowheader">
                  S{s}
                </div>
                {colunas.map((p) => {
                  const n = contagem.get(`${p}-${s}`) ?? 0;
                  const e = p * s;
                  return (
                    <div key={`${p}-${s}`} className={`celula celula-${corExposicao(e)}`} role="cell">
                      {n > 0 ? n : ""}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            P = probabilidade, S = severidade. Quanto mais alto e à direita, maior a exposição.
          </p>
        </section>

        <section>
          <h2>Lista</h2>
          {riscos.length === 0 ? (
            <div className="empty">Nenhum risco registrado para esta análise.</div>
          ) : (
            <ul className="lista-riscos">
              {riscos.map((r) => {
                const e = exposicao(r);
                return (
                  <li key={r.id} className="card">
                    <div className="cabeca-hipotese">
                      <span className={`badge badge-exp-${corExposicao(e)}`}>Exposição {e}</span>
                      <span className="chip">{ROTULO_RESPOSTA[r.resposta]}</span>
                      <span className="muted">{ROTULO_RISCO[r.status]}</span>
                    </div>
                    <p className="descricao">{r.descricao}</p>
                    {r.gatilho && <p className="muted">Gatilho: {r.gatilho}</p>}
                    {r.dono && <p className="muted">Dono: {r.dono}</p>}
                    <form action={mudarStatusRisco.bind(null, selecionada.id, r.id)} className="inline">
                      <select name="status" defaultValue={r.status} aria-label="Status do risco">
                        {STATUS_RISCO.map((s) => (
                          <option key={s} value={s}>
                            {ROTULO_RISCO[s]}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="botao-secundario">
                        Salvar
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}

          <details className="bloco-form">
            <summary>+ Novo risco</summary>
            <form action={criarRisco} className="form-grade">
              <input type="hidden" name="analise_id" value={selecionada.id} />
              <label className="campo campo-larga">
                <span>Descrição do risco</span>
                <input name="descricao" required minLength={3} maxLength={200} placeholder="Ex.: Resistência do time ao campo obrigatório" />
              </label>
              <label className="campo">
                <span>Probabilidade (1 a 5)</span>
                <input name="probabilidade" required inputMode="numeric" placeholder="1 a 5" />
              </label>
              <label className="campo">
                <span>Severidade (1 a 5)</span>
                <input name="severidade" required inputMode="numeric" placeholder="1 a 5" />
              </label>
              <label className="campo">
                <span>Resposta</span>
                <select name="resposta" defaultValue="mitigar">
                  {RESPOSTAS_RISCO.map((r) => (
                    <option key={r} value={r}>
                      {ROTULO_RESPOSTA[r]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="campo">
                <span>Hipótese relacionada (opcional)</span>
                <select name="hipotese_id" defaultValue="">
                  <option value="">Nenhuma</option>
                  {hipoteses.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.descricao.length > 60 ? `${h.descricao.slice(0, 59)}…` : h.descricao}
                    </option>
                  ))}
                </select>
              </label>
              <label className="campo">
                <span>Gatilho (opcional)</span>
                <input name="gatilho" placeholder="Quando o risco se materializa" />
              </label>
              <label className="campo">
                <span>Dono (opcional)</span>
                <input name="dono" placeholder="Responsável" />
              </label>
              <div className="acoes-form campo-larga">
                <button type="submit">Registrar risco</button>
              </div>
            </form>
          </details>
        </section>
      </div>
    </>
  );
}
