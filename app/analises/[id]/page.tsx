import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import {
  criarAcao,
  criarEvidencia,
  criarHipotese,
  mudarStatusAcao,
  mudarStatusHipotese,
} from "@/app/actions";
import { createClient } from "@/utils/supabase/server";
import {
  DIMENSOES,
  ROTULO_ACAO,
  ROTULO_DIMENSAO,
  ROTULO_HIPOTESE,
  STATUS_ACAO,
  STATUS_HIPOTESE,
  formatarData,
  formatarPeriodo,
  type Dimensao,
  type StatusAcao,
  type StatusHipotese,
} from "@/lib/dominios";

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
  dimensao: Dimensao;
  descricao: string;
  pai_id: string | null;
  status: StatusHipotese;
  impacto: number | null;
  viabilidade: number | null;
};

type Evidencia = { id: string; hipotese_id: string; descricao: string; fonte: string | null };

type Acao = {
  id: string;
  causa_id: string;
  o_que: string;
  por_que: string | null;
  quem: string | null;
  onde: string | null;
  como: string | null;
  quando: string | null;
  quanto: number | null;
  status: StatusAcao;
};

// ---- Componentes ---------------------------------------------------------

function NoHipotese({
  analiseId,
  hipotese,
  filhos,
  evidencias,
}: {
  analiseId: string;
  hipotese: Hipotese;
  filhos: Map<string, Hipotese[]>;
  evidencias: Evidencia[];
}) {
  const subcausas = filhos.get(hipotese.id) ?? [];
  const minhas = evidencias.filter((e) => e.hipotese_id === hipotese.id);

  return (
    <li className="no">
      <div className={`card hipotese status-${hipotese.status}`}>
        <div className="cabeca-hipotese">
          <span className="chip">{ROTULO_DIMENSAO[hipotese.dimensao]}</span>
          <span className={`badge badge-${hipotese.status}`}>{ROTULO_HIPOTESE[hipotese.status]}</span>
        </div>
        <p className="descricao">{hipotese.descricao}</p>
        <p className="muted">
          Impacto {hipotese.impacto ?? "—"} · Viabilidade {hipotese.viabilidade ?? "—"} · {minhas.length}{" "}
          evidência{minhas.length === 1 ? "" : "s"}
        </p>

        {minhas.length > 0 && (
          <ul className="evidencias">
            {minhas.map((e) => (
              <li key={e.id}>
                {e.descricao}
                {e.fonte && <span className="muted"> — {e.fonte}</span>}
              </li>
            ))}
          </ul>
        )}

        <div className="linha-acoes">
          <form action={mudarStatusHipotese.bind(null, analiseId, hipotese.id)} className="inline">
            <select name="status" defaultValue={hipotese.status} aria-label="Status da causa">
              {STATUS_HIPOTESE.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_HIPOTESE[s]}
                </option>
              ))}
            </select>
            <button type="submit" className="botao-secundario">
              Mudar status
            </button>
          </form>

          <details>
            <summary>Adicionar evidência</summary>
            <form action={criarEvidencia.bind(null, analiseId, hipotese.id)} className="inline-bloco">
              <input name="descricao" required minLength={3} placeholder="O que foi observado" />
              <input name="fonte" placeholder="Fonte (opcional)" />
              <button type="submit" className="botao-secundario">
                Salvar evidência
              </button>
            </form>
          </details>
        </div>
      </div>

      {subcausas.length > 0 && (
        <ul className="subcausas">
          {subcausas.map((s) => (
            <NoHipotese key={s.id} analiseId={analiseId} hipotese={s} filhos={filhos} evidencias={evidencias} />
          ))}
        </ul>
      )}
    </li>
  );
}

// ---- Página --------------------------------------------------------------

export default async function DetalheAnalise({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
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

  const idsHip = hipoteses.map((h) => h.id);
  const { data: evData } = idsHip.length
    ? await supabase.from("evidencias").select("id, hipotese_id, descricao, fonte").in("hipotese_id", idsHip)
    : { data: [] as Evidencia[] };
  const evidencias = (evData ?? []) as Evidencia[];

  const { data: acData } = await supabase
    .from("acoes")
    .select("id, causa_id, o_que, por_que, quem, onde, como, quando, quanto, status")
    .eq("analise_id", id)
    .order("criado_em");
  const acoes = (acData ?? []) as Acao[];

  // Árvore: raízes sem pai; filhos agrupados pelo pai_id.
  const filhos = new Map<string, Hipotese[]>();
  for (const h of hipoteses) {
    if (h.pai_id) filhos.set(h.pai_id, [...(filhos.get(h.pai_id) ?? []), h]);
  }
  const raizes = hipoteses.filter((h) => !h.pai_id);
  const validadas = hipoteses.filter((h) => h.status === "validada");
  const textoDaCausa = new Map(hipoteses.map((h) => [h.id, h.descricao]));

  return (
    <>
      <p className="muted">
        <Link href="/analises">← Análises</Link>
      </p>
      <div className="cabeca-pagina">
        <div>
          <h1>{analise.titulo}</h1>
          <p className="muted">
            {analise.indicador} · baseline {analise.baseline} → meta {analise.meta} ·{" "}
            {formatarPeriodo(analise.periodo_inicio, analise.periodo_fim)}
          </p>
        </div>
        <div className="linha-acoes">
          <Link href={`/analises/${id}/editar`} className="botao-secundario-link">
            Editar
          </Link>
          <Link href={`/analises/${id}/excluir`} className="botao-secundario-link botao-perigo-link">
            Excluir
          </Link>
        </div>
      </div>

      {erro && (
        <p role="alert" className="erro" style={{ marginTop: "1rem" }}>
          {erro}
        </p>
      )}

      {analise.efeito && (
        <div className="card efeito-card">
          <span className="rotulo">Efeito observado</span>
          <p>{analise.efeito}</p>
          <p className="muted">Efeito observado não comprova causalidade: ele indica onde investigar.</p>
        </div>
      )}

      <h2 style={{ marginTop: "2rem" }}>Causas e hipóteses</h2>
      {hipoteses.length === 0 ? (
        <div className="empty">Nenhuma hipótese registrada. Adicione a primeira abaixo.</div>
      ) : (
        <ul className="arvore">
          {raizes.map((h) => (
            <NoHipotese key={h.id} analiseId={id} hipotese={h} filhos={filhos} evidencias={evidencias} />
          ))}
        </ul>
      )}

      <details className="bloco-form">
        <summary>+ Nova hipótese</summary>
        <form action={criarHipotese.bind(null, id)} className="form-grade">
          <label className="campo">
            <span>Dimensão</span>
            <select name="dimensao" required defaultValue="processo">
              {DIMENSOES.map((d) => (
                <option key={d} value={d}>
                  {ROTULO_DIMENSAO[d]}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>Causa-pai (opcional, para subcausa)</span>
            <select name="pai_id" defaultValue="">
              <option value="">Nenhuma (causa principal)</option>
              {hipoteses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.descricao.length > 60 ? `${h.descricao.slice(0, 59)}…` : h.descricao}
                </option>
              ))}
            </select>
          </label>
          <label className="campo campo-larga">
            <span>Descrição</span>
            <input name="descricao" required minLength={3} maxLength={200} placeholder="Ex.: Critérios de aceite sem exemplos" />
          </label>
          <label className="campo">
            <span>Impacto (1 a 5)</span>
            <input name="impacto" inputMode="numeric" placeholder="—" />
          </label>
          <label className="campo">
            <span>Viabilidade (1 a 5)</span>
            <input name="viabilidade" inputMode="numeric" placeholder="—" />
          </label>
          <div className="acoes-form campo-larga">
            <button type="submit">Criar hipótese</button>
          </div>
        </form>
      </details>

      <h2 style={{ marginTop: "2.5rem" }}>Ações</h2>
      {acoes.length === 0 ? (
        <div className="empty">
          {validadas.length === 0
            ? "Nenhuma ação ainda. Uma ação só pode ser criada sobre uma causa validada, e nesta análise ainda não há nenhuma."
            : "Nenhuma ação registrada para esta análise."}
        </div>
      ) : (
        <ul className="lista-acoes">
          {acoes.map((a) => (
            <li key={a.id} className="card">
              <div className="cabeca-hipotese">
                <span className={`badge badge-acao-${a.status}`}>{ROTULO_ACAO[a.status]}</span>
                <span className="muted">Causa: {textoDaCausa.get(a.causa_id) ?? "—"}</span>
              </div>
              <p className="descricao">
                <strong>{a.o_que}</strong>
              </p>
              <p className="muted">
                {a.quem && <>Quem: {a.quem} · </>}
                {a.onde && <>Onde: {a.onde} · </>}
                {a.quando && <>Prazo: {formatarData(a.quando)} · </>}
                {a.quanto !== null && <>Esforço: {a.quanto}</>}
              </p>
              {a.por_que && <p className="muted">Por quê: {a.por_que}</p>}
              {a.como && <p className="muted">Como: {a.como}</p>}
              <form action={mudarStatusAcao.bind(null, id, a.id)} className="inline" style={{ marginTop: "0.5rem" }}>
                <input type="hidden" name="destino" value={`/analises/${id}`} />
                <select name="status" defaultValue={a.status} aria-label="Status da ação">
                  {STATUS_ACAO.map((s) => (
                    <option key={s} value={s}>
                      {ROTULO_ACAO[s]}
                    </option>
                  ))}
                </select>
                <button type="submit" className="botao-secundario">
                  Mudar status
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <details className="bloco-form">
        <summary>+ Nova ação</summary>
        {validadas.length === 0 ? (
          <p className="muted" style={{ padding: "0.75rem 0" }}>
            Valide uma causa com evidência antes de criar uma ação.
          </p>
        ) : (
          <form action={criarAcao.bind(null, id)} className="form-grade">
            <label className="campo campo-larga">
              <span>Causa validada que a ação ataca</span>
              <select name="causa_id" required defaultValue="">
                <option value="" disabled>
                  Escolha uma causa
                </option>
                {validadas.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.descricao.length > 70 ? `${h.descricao.slice(0, 69)}…` : h.descricao}
                  </option>
                ))}
              </select>
            </label>
            <label className="campo campo-larga">
              <span>O que será feito</span>
              <input name="o_que" required minLength={3} maxLength={200} placeholder="Ex.: Incluir exemplos nos critérios de aceite" />
            </label>
            <label className="campo">
              <span>Por quê</span>
              <input name="por_que" placeholder="Opcional" />
            </label>
            <label className="campo">
              <span>Quem</span>
              <input name="quem" placeholder="Responsável" />
            </label>
            <label className="campo">
              <span>Onde</span>
              <input name="onde" placeholder="Ferramenta ou local" />
            </label>
            <label className="campo">
              <span>Como</span>
              <input name="como" placeholder="Método" />
            </label>
            <label className="campo">
              <span>Prazo</span>
              <input type="date" name="quando" />
            </label>
            <label className="campo">
              <span>Esforço (número)</span>
              <input name="quanto" inputMode="decimal" placeholder="Ex.: 8" />
            </label>
            <div className="acoes-form campo-larga">
              <button type="submit">Criar ação</button>
            </div>
          </form>
        )}
      </details>

      <p style={{ marginTop: "2rem" }}>
        <Link href={`/riscos?analise=${id}`}>Riscos desta análise →</Link>
      </p>
    </>
  );
}
