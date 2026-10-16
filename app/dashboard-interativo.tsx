"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AntesDepois, BarrasEmpilhadas, BarrasHorizontais, Colunas, Donut, type Parte } from "@/app/graficos";

export type AnaliseD = {
  id: string;
  titulo: string;
  indicador: string;
  periodo_inicio: string;
  periodo_fim: string;
  baseline: number;
  meta: number;
  resultado_medido: number | null;
};
export type HipD = { id: string; analise_id: string; dimensao: string; status: StatusHip };
export type AcaoD = { id: string; analise_id: string; status: StatusAcaoD; quando: string | null };
export type RiscoD = { id: string; analise_id: string; probabilidade: number; severidade: number; status: string };

type StatusHip = "hipotese" | "validada" | "descartada";
type StatusAcaoD = "planejada" | "em_andamento" | "concluida" | "cancelada";
type Bucket = "atrasada" | StatusAcaoD;
type Faixa = "baixa" | "media" | "alta";

export type Filtro =
  | { tipo: "nenhum" }
  | { tipo: "analise"; valor: string }
  | { tipo: "com_resultado" }
  | { tipo: "hipotese"; valor: StatusHip }
  | { tipo: "dimensao"; valor: string }
  | { tipo: "acao"; valor: Bucket }
  | { tipo: "risco"; valor: Faixa };

const NENHUM: Filtro = { tipo: "nenhum" };

const DIMENSOES: [string, string][] = [
  ["pessoas", "Pessoas"],
  ["processo", "Processo"],
  ["ferramentas", "Ferramentas"],
  ["dados", "Dados"],
  ["dependencias", "Dependências"],
  ["politicas", "Políticas"],
  ["ambiente", "Ambiente"],
];

const ROTULO_HIP: Record<StatusHip, string> = { hipotese: "Em aberto", validada: "Validadas", descartada: "Descartadas" };
const COR_HIP: Record<StatusHip, string> = { hipotese: "#c9a227", validada: "#17707a", descartada: "#8a8f98" };
const STATUS_HIP: StatusHip[] = ["hipotese", "validada", "descartada"];

const ROTULO_BUCKET: Record<Bucket, string> = {
  atrasada: "Atrasadas",
  planejada: "Planejadas",
  em_andamento: "Em andamento",
  concluida: "Concluídas",
  cancelada: "Canceladas",
};
const COR_BUCKET: Record<Bucket, string> = {
  atrasada: "#d9482b",
  planejada: "#6b7280",
  em_andamento: "#c9a227",
  concluida: "#17707a",
  cancelada: "#4b5563",
};
const BUCKETS: Bucket[] = ["atrasada", "planejada", "em_andamento", "concluida", "cancelada"];

const ROTULO_FAIXA: Record<Faixa, string> = { baixa: "Baixa (1–7)", media: "Média (8–14)", alta: "Alta (15–25)" };
const COR_FAIXA: Record<Faixa, string> = { baixa: "#17707a", media: "#c9a227", alta: "#d9482b" };
const FAIXAS: Faixa[] = ["baixa", "media", "alta"];

const exposicao = (r: RiscoD) => r.probabilidade * r.severidade;
const faixaDe = (e: number): Faixa => (e >= 15 ? "alta" : e >= 8 ? "media" : "baixa");
const pct = (parte: number, total: number) => (total === 0 ? 0 : Math.round((parte * 100) / total));
const atrasada = (a: AcaoD, hoje: string) =>
  (a.status === "planejada" || a.status === "em_andamento") && !!a.quando && a.quando < hoje;
const bucketDe = (a: AcaoD, hoje: string): Bucket => (atrasada(a, hoje) ? "atrasada" : a.status);

const mesmoFiltro = (a: Filtro, b: Filtro) =>
  a.tipo === b.tipo && (("valor" in a ? a.valor : null) === ("valor" in b ? b.valor : null));

function rotuloFiltro(f: Filtro, analises: AnaliseD[]): string {
  switch (f.tipo) {
    case "nenhum":
      return "";
    case "analise":
      return `Análise: ${analises.find((a) => a.id === f.valor)?.titulo ?? "selecionada"}`;
    case "com_resultado":
      return "Com efeito observado";
    case "hipotese":
      return `Hipóteses: ${ROTULO_HIP[f.valor]}`;
    case "dimensao":
      return `Dimensão: ${DIMENSOES.find(([c]) => c === f.valor)?.[1] ?? f.valor}`;
    case "acao":
      return `Ações: ${ROTULO_BUCKET[f.valor]}`;
    case "risco":
      return `Exposição: ${ROTULO_FAIXA[f.valor]}`;
  }
}

type Props = {
  hoje: string;
  analises: AnaliseD[];
  hipoteses: HipD[];
  acoes: AcaoD[];
  riscos: RiscoD[];
};

export function DashboardInterativo({ hoje, analises, hipoteses, acoes, riscos }: Props) {
  const [filtro, setFiltro] = useState<Filtro>(NENHUM);

  // Clicar no filtro que já está ativo desfaz o filtro.
  const alternar = (novo: Filtro) => setFiltro((atual) => (mesmoFiltro(atual, novo) ? NENHUM : novo));

  // Todo o painel é calculado a partir do filtro: indicadores, gráficos e tabela.
  const { analisesF, hips, acs, rsc } = useMemo(() => {
    const f = filtro;
    const anaOk = (id: string) => f.tipo !== "analise" || id === f.valor;

    const hipBase = hipoteses.filter(
      (h) =>
        anaOk(h.analise_id) &&
        (f.tipo !== "hipotese" || h.status === f.valor) &&
        (f.tipo !== "dimensao" || h.dimensao === f.valor),
    );
    const acoesBase = acoes.filter((a) => anaOk(a.analise_id) && (f.tipo !== "acao" || bucketDe(a, hoje) === f.valor));
    const riscosBase = riscos.filter(
      (r) => anaOk(r.analise_id) && (f.tipo !== "risco" || faixaDe(exposicao(r)) === f.valor),
    );

    // Com filtro por item, só entram as análises que têm algum item que casa com o filtro.
    const exigeItem = f.tipo === "hipotese" || f.tipo === "dimensao" || f.tipo === "acao" || f.tipo === "risco";
    const comItens = new Set<string>();
    if (f.tipo === "hipotese" || f.tipo === "dimensao") hipBase.forEach((h) => comItens.add(h.analise_id));
    if (f.tipo === "acao") acoesBase.forEach((a) => comItens.add(a.analise_id));
    if (f.tipo === "risco") riscosBase.forEach((r) => comItens.add(r.analise_id));

    const analisesFiltradas = analises.filter(
      (a) =>
        anaOk(a.id) &&
        (f.tipo !== "com_resultado" || a.resultado_medido !== null) &&
        (!exigeItem || comItens.has(a.id)),
    );
    const ids = new Set(analisesFiltradas.map((a) => a.id));

    return {
      analisesF: analisesFiltradas,
      hips: hipBase.filter((h) => ids.has(h.analise_id)),
      acs: acoesBase.filter((a) => ids.has(a.analise_id)),
      rsc: riscosBase.filter((r) => ids.has(r.analise_id)),
    };
  }, [filtro, analises, hipoteses, acoes, riscos, hoje]);

  // Indicadores
  const validadas = hips.filter((h) => h.status === "validada").length;
  const pctValidadas = pct(validadas, hips.length);
  const atrasadas = acs.filter((a) => atrasada(a, hoje)).length;
  const riscosAltos = rsc.filter((r) => r.status === "aberto" && faixaDe(exposicao(r)) === "alta").length;
  const efeitos = analisesF.filter((a) => a.resultado_medido !== null).length;

  // Dados dos gráficos
  const partesHip: Parte[] = STATUS_HIP.map((s) => ({
    chave: s,
    rotulo: ROTULO_HIP[s],
    valor: hips.filter((h) => h.status === s).length,
    cor: COR_HIP[s],
  }));
  const partesAcao: Parte[] = BUCKETS.map((b) => ({
    chave: b,
    rotulo: ROTULO_BUCKET[b],
    valor: acs.filter((a) => bucketDe(a, hoje) === b).length,
    cor: COR_BUCKET[b],
  }));
  const partesRisco: Parte[] = FAIXAS.map((fx) => ({
    chave: fx,
    rotulo: ROTULO_FAIXA[fx],
    valor: rsc.filter((r) => faixaDe(exposicao(r)) === fx).length,
    cor: COR_FAIXA[fx],
  }));
  const linhasDim = DIMENSOES.map(([chave, rotulo]) => ({
    chave,
    rotulo,
    segmentos: STATUS_HIP.map((s) => ({
      chave: s,
      rotulo: ROTULO_HIP[s],
      valor: hips.filter((h) => h.dimensao === chave && h.status === s).length,
      cor: COR_HIP[s],
    })),
  }));
  const comparacao = analisesF
    .filter((a) => a.resultado_medido !== null)
    .map((a) => ({
      chave: a.id,
      rotulo: a.titulo,
      antes: a.baseline,
      depois: a.resultado_medido as number,
      meta: a.meta,
    }));

  const ativoHip = filtro.tipo === "hipotese" ? filtro.valor : undefined;
  const ativoAcao = filtro.tipo === "acao" ? filtro.valor : undefined;
  const ativoRisco = filtro.tipo === "risco" ? filtro.valor : undefined;
  const ativoDim = filtro.tipo === "dimensao" ? filtro.valor : undefined;
  const ativoAnalise = filtro.tipo === "analise" ? filtro.valor : undefined;

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

  return (
    <>
      <h1>Dashboard gerencial</h1>
      <p className="muted">
        O que os dados dizem sobre o fluxo, antes das opiniões. Efeito observado não comprova causalidade.
      </p>

      <div className="barra-filtro">
        {filtro.tipo === "nenhum" ? (
          <span className="muted">Clique em um indicador ou em um gráfico para filtrar. Clique de novo para desfazer.</span>
        ) : (
          <>
            <span className="chip chip-ativo">{rotuloFiltro(filtro, analises)}</span>
            <button type="button" className="botao-secundario" onClick={() => setFiltro(NENHUM)}>
              Limpar filtro
            </button>
          </>
        )}
      </div>

      <div className="grade-kpi">
        <Kpi
          rotulo="Análises"
          valor={analisesF.length}
          ativo={filtro.tipo === "nenhum"}
          onClick={() => setFiltro(NENHUM)}
        />
        <Kpi
          rotulo={`Hipóteses validadas (${validadas} de ${hips.length})`}
          valor={`${pctValidadas}%`}
          ativo={filtro.tipo === "hipotese" && filtro.valor === "validada"}
          onClick={() => alternar({ tipo: "hipotese", valor: "validada" })}
        />
        <Kpi
          rotulo="Ações atrasadas"
          valor={atrasadas}
          alerta={atrasadas > 0}
          ativo={filtro.tipo === "acao" && filtro.valor === "atrasada"}
          onClick={() => alternar({ tipo: "acao", valor: "atrasada" })}
        />
        <Kpi
          rotulo="Riscos abertos de exposição alta"
          valor={riscosAltos}
          alerta={riscosAltos > 0}
          ativo={filtro.tipo === "risco" && filtro.valor === "alta"}
          onClick={() => alternar({ tipo: "risco", valor: "alta" })}
        />
        <Kpi
          rotulo="Efeitos observados"
          valor={efeitos}
          ativo={filtro.tipo === "com_resultado"}
          onClick={() => alternar({ tipo: "com_resultado" })}
        />
      </div>

      <div className="grade-graficos">
        <section className="card grafico">
          <h2>Hipóteses por status</h2>
          <p className="muted">Clique numa fatia ou numa legenda para filtrar.</p>
          <Donut
            partes={partesHip}
            ativo={ativoHip}
            onSelecionar={(c) => alternar({ tipo: "hipotese", valor: c as StatusHip })}
            centro={{ valor: `${pctValidadas}%`, sub: "validadas" }}
          />
        </section>

        <section className="card grafico">
          <h2>Ações por situação</h2>
          <p className="muted">Atrasadas são as planejadas ou em andamento com prazo vencido.</p>
          <BarrasHorizontais
            itens={partesAcao}
            ativo={ativoAcao}
            onSelecionar={(c) => alternar({ tipo: "acao", valor: c as Bucket })}
          />
        </section>

        <section className="card grafico">
          <h2>Riscos por exposição</h2>
          <p className="muted">Exposição = probabilidade × severidade, todos os status.</p>
          <Colunas
            itens={partesRisco}
            ativo={ativoRisco}
            onSelecionar={(c) => alternar({ tipo: "risco", valor: c as Faixa })}
          />
        </section>

        <section className="card grafico">
          <h2>Antes × depois</h2>
          {comparacao.length === 0 ? (
            <p className="muted">
              Nenhuma análise com resultado medido neste filtro. Preencha “Resultado medido” na edição de uma análise.
            </p>
          ) : (
            <AntesDepois
              itens={comparacao}
              ativo={ativoAnalise}
              onSelecionar={(c) => alternar({ tipo: "analise", valor: c })}
            />
          )}
        </section>

        <section className="card grafico grafico-largo">
          <h2>Hipóteses por dimensão</h2>
          <p className="muted">Clique numa dimensão para ver só as suas causas.</p>
          <BarrasEmpilhadas
            linhas={linhasDim}
            ativo={ativoDim}
            onSelecionar={(c) => alternar({ tipo: "dimensao", valor: c })}
          />
          <div className="grafico-legenda">
            {STATUS_HIP.map((s) => (
              <span key={s}>
                <span className="ponto" style={{ background: COR_HIP[s] }} /> {ROTULO_HIP[s]}
              </span>
            ))}
          </div>
        </section>
      </div>

      <h2 style={{ marginTop: "2.5rem" }}>Portfólio de análises</h2>
      <p className="muted">
        {analisesF.length} de {analises.length} análises. Clique no nome para filtrar pela análise.
      </p>
      {analisesF.length === 0 ? (
        <div className="empty">Nenhuma análise corresponde a este filtro.</div>
      ) : (
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
              {analisesF.map((a) => {
                const h = hips.filter((x) => x.analise_id === a.id);
                const ac = acs.filter((x) => x.analise_id === a.id);
                const concluidas = ac.filter((x) => x.status === "concluida").length;
                const progresso = pct(concluidas, ac.length);
                return (
                  <tr key={a.id} className={ativoAnalise === a.id ? "linha-ativa" : ""}>
                    <td>
                      <button type="button" className="link-botao" onClick={() => alternar({ tipo: "analise", valor: a.id })}>
                        {a.titulo}
                      </button>{" "}
                      <Link href={`/analises/${a.id}`} className="muted">
                        abrir →
                      </Link>
                    </td>
                    <td className="muted">{a.indicador}</td>
                    <td className="mono">
                      {a.baseline} → {a.meta}
                    </td>
                    <td className="muted">
                      {new Date(`${a.periodo_inicio}T00:00:00`).toLocaleDateString("pt-BR")} a{" "}
                      {new Date(`${a.periodo_fim}T00:00:00`).toLocaleDateString("pt-BR")}
                    </td>
                    <td>
                      {h.filter((x) => x.status === "validada").length} de {h.length}
                    </td>
                    <td>
                      {ac.length === 0 ? (
                        <span className="muted">Sem ações</span>
                      ) : (
                        <div className="progresso" aria-label={`${progresso}% concluído`}>
                          <div className="progresso-barra" style={{ width: `${progresso}%` }} />
                          <span>
                            {concluidas}/{ac.length} · {progresso}%
                          </span>
                        </div>
                      )}
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

function Kpi({
  rotulo,
  valor,
  onClick,
  ativo,
  alerta,
}: {
  rotulo: string;
  valor: number | string;
  onClick: () => void;
  ativo: boolean;
  alerta?: boolean;
}) {
  return (
    <button type="button" className={`card kpi ${ativo ? "kpi-ativo" : ""}`} aria-pressed={ativo} onClick={onClick}>
      <span className={`numero ${alerta ? "numero-alerta" : ""}`}>{valor}</span>
      <span className="muted">{rotulo}</span>
    </button>
  );
}
