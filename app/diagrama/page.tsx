import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { SeletorAnalise } from "@/app/diagrama/seletor-analise";

type Status = "hipotese" | "validada" | "descartada";

type Analise = { id: string; titulo: string; efeito: string | null };

type Hip = {
  id: string;
  dimensao: string;
  descricao: string;
  pai_id: string | null;
  status: Status;
};

type Item = { texto: string; status: Status; subcausa: boolean };

// Cada item vira uma caixa com o texto quebrado em linhas; a altura acompanha o texto.
type Caixa = Item & { linhas: string[]; largura: number; altura: number };

const DIM_TOPO = ["pessoas", "processo", "ferramentas", "dados"] as const;
const DIM_BASE = ["dependencias", "politicas", "ambiente"] as const;

const ROTULO: Record<string, string> = {
  pessoas: "Pessoas",
  processo: "Processo",
  ferramentas: "Ferramentas",
  dados: "Dados",
  dependencias: "Dependências",
  politicas: "Políticas",
  ambiente: "Ambiente",
};

// Geometria (unidades do SVG)
const LARGURA_CAUSA = 190;
const LARGURA_SUB = 170;
const CARACTERES_CAUSA = 28;
const CARACTERES_SUB = 24;
const LINHA = 15;
const PAD = 7;
const GAP = 12;
const FOLGA = 6; // distância entre a caixa e a espinha
const ESP_X = 220; // espaçamento horizontal entre espinhas
const LABEL_H = 26;
const LABEL_TOPO_Y = 40;
const INICIO_TOPO_Y = 74;
const X_INICIO = 30;
const X_CABECA = 1040;
const LARGURA_CABECA = 200;
const DESLOC_TOPO = 110; // quanto a espinha se inclina

// Quebra o texto em linhas de até `largura` caracteres, sem cortar palavras.
function quebrar(texto: string, largura: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.trim().split(/\s+/)) {
    const candidata = atual ? `${atual} ${palavra}` : palavra;
    if (candidata.length > largura && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = candidata;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

// Causas da dimensão, cada uma seguida das suas subcausas (via pai_id).
function montarItens(hips: Hip[], dimensao: string): Item[] {
  const itens: Item[] = [];
  for (const raiz of hips.filter((h) => !h.pai_id && h.dimensao === dimensao)) {
    itens.push({ texto: raiz.descricao, status: raiz.status, subcausa: false });
    for (const filha of hips.filter((h) => h.pai_id === raiz.id)) {
      itens.push({ texto: filha.descricao, status: filha.status, subcausa: true });
    }
  }
  return itens;
}

function montarCaixas(itens: Item[]): Caixa[] {
  return itens.map((it) => {
    const largura = it.subcausa ? LARGURA_SUB : LARGURA_CAUSA;
    const linhas = quebrar(it.subcausa ? `↳ ${it.texto}` : it.texto, it.subcausa ? CARACTERES_SUB : CARACTERES_CAUSA);
    return { ...it, linhas, largura, altura: PAD * 2 + linhas.length * LINHA };
  });
}

const alturaPilha = (caixas: Caixa[]) => caixas.reduce((s, c) => s + c.altura + GAP, 0);

export default async function Diagrama({
  searchParams,
}: {
  searchParams: Promise<{ analise?: string }>;
}) {
  const { analise: analiseParam } = await searchParams;
  const supabase = createClient(await cookies());

  const { data: listaData, error: erroLista } = await supabase
    .from("analises")
    .select("id, titulo, efeito")
    .order("titulo");

  if (erroLista) {
    return (
      <>
        <h1>Diagrama de Ishikawa</h1>
        <p role="alert" className="erro">
          Não foi possível carregar as análises: {erroLista.message}
        </p>
      </>
    );
  }

  const analises = (listaData ?? []) as Analise[];
  if (analises.length === 0) {
    return (
      <>
        <h1>Diagrama de Ishikawa</h1>
        <div className="empty">Cadastre uma análise para montar o diagrama.</div>
      </>
    );
  }

  const selecionada = analises.find((a) => a.id === analiseParam) ?? analises[0];

  const { data: hipData } = await supabase
    .from("hipoteses")
    .select("id, dimensao, descricao, pai_id, status")
    .eq("analise_id", selecionada.id);

  const hips = (hipData ?? []) as Hip[];

  // Caixas por espinha e altura total do desenho (calculada a partir do conteúdo).
  const topo = DIM_TOPO.map((d, i) => ({ dim: d, bx: 330 + i * ESP_X, caixas: montarCaixas(montarItens(hips, d)) }));
  const base = DIM_BASE.map((d, i) => ({ dim: d, bx: 440 + i * ESP_X, caixas: montarCaixas(montarItens(hips, d)) }));

  const pilhaTopo = Math.max(40, ...topo.map((g) => alturaPilha(g.caixas)));
  const pilhaBase = Math.max(40, ...base.map((g) => alturaPilha(g.caixas)));

  const espinhaY = INICIO_TOPO_Y + pilhaTopo + 24;
  const labelBaseY = espinhaY + 24 + pilhaBase + 14;
  const altura = labelBaseY + LABEL_H + 36;

  // Espinha superior: x cresce conforme y desce até a espinha central.
  const xTopo = (bx: number, y: number) => bx - DESLOC_TOPO + (DESLOC_TOPO * (y - (LABEL_TOPO_Y + LABEL_H))) / (espinhaY - (LABEL_TOPO_Y + LABEL_H));
  // Espinha inferior: x diminui conforme y desce.
  const xBase = (bx: number, y: number) => bx - (DESLOC_TOPO * (y - espinhaY)) / (labelBaseY - espinhaY);

  const textoEfeito = selecionada.efeito ?? selecionada.titulo;
  const linhasEfeito = quebrar(textoEfeito, 24);
  const alturaCabeca = 44 + linhasEfeito.length * 18 + 14;
  const yCabeca = espinhaY - alturaCabeca / 2;

  const classeStatus = (c: Caixa) =>
    `caixa caixa-${c.status}${c.subcausa ? " caixa-sub" : ""}`;

  return (
    <>
      <h1>Diagrama de Ishikawa</h1>

      <SeletorAnalise analises={analises} selecionadaId={selecionada.id} />

      <div className="diagrama card">
        <svg viewBox={`0 0 1260 ${altura}`} role="img" aria-label={`Diagrama de Ishikawa: ${selecionada.titulo}`}>
          {/* Espinha central */}
          <line x1={X_INICIO} y1={espinhaY} x2={X_CABECA} y2={espinhaY} className="eixo" />

          {/* Efeito (cabeça do peixe) */}
          <rect x={X_CABECA} y={yCabeca} width={LARGURA_CABECA} height={alturaCabeca} rx={6} className="cabeca" />
          <text x={X_CABECA + 14} y={yCabeca + 20} className="rotulo-svg">
            EFEITO
          </text>
          {linhasEfeito.map((linha, i) => (
            <text key={i} x={X_CABECA + 14} y={yCabeca + 40 + i * 18} className="efeito-txt">
              {linha}
            </text>
          ))}

          {/* Espinhas superiores */}
          {topo.map((g) => {
            const xInicio = g.bx - DESLOC_TOPO;
            let cursor = INICIO_TOPO_Y;
            return (
              <g key={g.dim}>
                <line x1={xInicio} y1={LABEL_TOPO_Y + LABEL_H} x2={g.bx} y2={espinhaY} className="osso" />
                <rect x={xInicio - 80} y={LABEL_TOPO_Y} width={160} height={LABEL_H} rx={4} className="dim-caixa" />
                <text x={xInicio} y={LABEL_TOPO_Y + 17} textAnchor="middle" className="dim">
                  {ROTULO[g.dim]}
                </text>
                {g.caixas.length === 0 && (
                  <text x={xInicio + 14} y={LABEL_TOPO_Y + LABEL_H + 22} className="sem-causas">
                    sem causas
                  </text>
                )}
                {g.caixas.map((c, k) => {
                  const yTopo = cursor;
                  const yFundo = cursor + c.altura;
                  const meio = yTopo + c.altura / 2;
                  const xEspinha = xTopo(g.bx, yTopo);
                  const direita = Math.min(xEspinha, xTopo(g.bx, yFundo)) - FOLGA;
                  const esquerda = direita - c.largura;
                  cursor += c.altura + GAP;
                  return (
                    <g key={k} className={c.status === "descartada" ? "caixa-grupo caixa-grupo-descartada" : "caixa-grupo"}>
                      <line x1={direita} y1={meio} x2={xTopo(g.bx, meio)} y2={meio} className="conector" />
                      <rect x={esquerda} y={yTopo} width={c.largura} height={c.altura} rx={4} className={classeStatus(c)} />
                      <text className="texto-caixa">
                        {c.linhas.map((linha, j) => (
                          <tspan key={j} x={esquerda + PAD} y={yTopo + PAD + LINHA * (j + 1) - 3}>
                            {linha}
                          </tspan>
                        ))}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Espinhas inferiores */}
          {base.map((g) => {
            const xFim = g.bx - DESLOC_TOPO;
            let cursor = espinhaY + 24;
            return (
              <g key={g.dim}>
                <line x1={g.bx} y1={espinhaY} x2={xFim} y2={labelBaseY} className="osso" />
                <rect x={xFim - 80} y={labelBaseY} width={160} height={LABEL_H} rx={4} className="dim-caixa" />
                <text x={xFim} y={labelBaseY + 17} textAnchor="middle" className="dim">
                  {ROTULO[g.dim]}
                </text>
                {g.caixas.length === 0 && (
                  <text x={xFim + 14} y={labelBaseY - 8} className="sem-causas">
                    sem causas
                  </text>
                )}
                {g.caixas.map((c, k) => {
                  const yTopo = cursor;
                  const yFundo = cursor + c.altura;
                  const meio = yTopo + c.altura / 2;
                  const xEspinha = xBase(g.bx, yFundo);
                  const direita = Math.min(xEspinha, xBase(g.bx, yTopo)) - FOLGA;
                  const esquerda = direita - c.largura;
                  cursor += c.altura + GAP;
                  return (
                    <g key={k} className={c.status === "descartada" ? "caixa-grupo caixa-grupo-descartada" : "caixa-grupo"}>
                      <line x1={direita} y1={meio} x2={xBase(g.bx, meio)} y2={meio} className="conector" />
                      <rect x={esquerda} y={yTopo} width={c.largura} height={c.altura} rx={4} className={classeStatus(c)} />
                      <text className="texto-caixa">
                        {c.linhas.map((linha, j) => (
                          <tspan key={j} x={esquerda + PAD} y={yTopo + PAD + LINHA * (j + 1) - 3}>
                            {linha}
                          </tspan>
                        ))}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="legenda muted">
        <span className="txt-validada">● Validada</span>
        <span className="txt-hipotese">● Em aberto</span>
        <span className="txt-descartada">● Descartada</span>
        <span>↳ subcausa</span>
      </div>

      {hips.length === 0 && (
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Esta análise ainda não tem hipóteses, por isso as espinhas estão vazias.{" "}
          <Link href={`/analises/${selecionada.id}`}>Adicione as causas na página da análise</Link> para montar o diagrama.
        </p>
      )}
    </>
  );
}
