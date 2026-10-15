import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

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

// Geometria do desenho (viewBox 1000 x 510)
const ESPINHA_Y = 280;
const MAX_VISIVEIS = 5;
const LARGURA_TEXTO = 26;

const truncar = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function quebrar(texto: string, largura: number, maxLinhas: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(/\s+/)) {
    const candidata = atual ? `${atual} ${palavra}` : palavra;
    if (candidata.length > largura) {
      if (atual) linhas.push(atual);
      atual = palavra;
    } else {
      atual = candidata;
    }
  }
  if (atual) linhas.push(atual);
  if (linhas.length > maxLinhas) {
    const corte = linhas.slice(0, maxLinhas);
    corte[maxLinhas - 1] = truncar(`${corte[maxLinhas - 1]}…`, largura);
    return corte;
  }
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

const classeItem = (it: Item) => {
  const cor =
    it.status === "validada" ? "txt-validada" : it.status === "descartada" ? "txt-descartada" : "txt-hipotese";
  return `item ${cor}${it.subcausa ? " sub" : ""}`;
};

const prefixo = (it: Item) => (it.subcausa ? "↳ " : "• ");

// Mostra até MAX_VISIVEIS itens; se houver mais, o último slot vira "+N mais".
function itensVisiveis(itens: Item[]) {
  if (itens.length <= MAX_VISIVEIS) return { mostrados: itens, extras: 0 };
  return { mostrados: itens.slice(0, MAX_VISIVEIS - 1), extras: itens.length - (MAX_VISIVEIS - 1) };
}

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
  const topo = DIM_TOPO.map((d) => ({ dim: d, itens: montarItens(hips, d) }));
  const base = DIM_BASE.map((d) => ({ dim: d, itens: montarItens(hips, d) }));

  const textoEfeito = selecionada.efeito ?? selecionada.titulo;
  const linhasEfeito = quebrar(textoEfeito, 22, 6);

  return (
    <>
      <h1>Diagrama de Ishikawa</h1>

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
        <button type="submit">Ver diagrama</button>
        <Link href={`/analises/${selecionada.id}`} className="muted">
          Ver detalhes →
        </Link>
      </form>

      <div className="diagrama card">
        <svg viewBox="0 0 1000 510" role="img" aria-label={`Diagrama de Ishikawa: ${selecionada.titulo}`}>
          {/* Espinha central */}
          <line x1={40} y1={ESPINHA_Y} x2={790} y2={ESPINHA_Y} className="eixo" />

          {/* Efeito (cabeça do peixe) */}
          <rect x={790} y={190} width={190} height={180} rx={6} className="cabeca" />
          <text x={805} y={212} className="rotulo-svg">
            EFEITO
          </text>
          {linhasEfeito.map((linha, i) => (
            <text key={i} x={805} y={236 + i * 17} className="efeito-txt">
              {linha}
            </text>
          ))}

          {/* Espinhas superiores */}
          {topo.map((g, i) => {
            const bx = 220 + i * 180;
            const xTopo = bx - 90;
            const { mostrados, extras } = itensVisiveis(g.itens);
            return (
              <g key={g.dim}>
                <line x1={xTopo} y1={90} x2={bx} y2={ESPINHA_Y} className="osso" />
                <rect x={xTopo - 75} y={58} width={150} height={26} rx={4} className="dim-caixa" />
                <text x={xTopo} y={75} textAnchor="middle" className="dim">
                  {ROTULO[g.dim]}
                </text>
                {mostrados.map((it, k) => {
                  const y = 130 + k * 26;
                  const x = xTopo + (90 * (y - 90)) / (ESPINHA_Y - 90);
                  return (
                    <text key={k} x={x - 8} y={y + 4} textAnchor="end" className={classeItem(it)}>
                      {prefixo(it)}
                      {truncar(it.texto, LARGURA_TEXTO)}
                    </text>
                  );
                })}
                {extras > 0 && (
                  <text x={xTopo + (90 * (130 + (MAX_VISIVEIS - 1) * 26 - 90)) / (ESPINHA_Y - 90) - 8} y={130 + (MAX_VISIVEIS - 1) * 26 + 4} textAnchor="end" className="mais">
                    +{extras} mais
                  </text>
                )}
              </g>
            );
          })}

          {/* Espinhas inferiores */}
          {base.map((g, i) => {
            const bx = 310 + i * 180;
            const xBase = bx - 90;
            const { mostrados, extras } = itensVisiveis(g.itens);
            return (
              <g key={g.dim}>
                <line x1={bx} y1={ESPINHA_Y} x2={xBase} y2={470} className="osso" />
                <rect x={xBase - 75} y={470} width={150} height={26} rx={4} className="dim-caixa" />
                <text x={xBase} y={487} textAnchor="middle" className="dim">
                  {ROTULO[g.dim]}
                </text>
                {mostrados.map((it, k) => {
                  const y = 300 + k * 26;
                  const x = bx - (90 * (y - ESPINHA_Y)) / (470 - ESPINHA_Y);
                  return (
                    <text key={k} x={x - 8} y={y + 4} textAnchor="end" className={classeItem(it)}>
                      {prefixo(it)}
                      {truncar(it.texto, LARGURA_TEXTO)}
                    </text>
                  );
                })}
                {extras > 0 && (
                  <text x={bx - (90 * (300 + (MAX_VISIVEIS - 1) * 26 - ESPINHA_Y)) / (470 - ESPINHA_Y) - 8} y={300 + (MAX_VISIVEIS - 1) * 26 + 4} textAnchor="end" className="mais">
                    +{extras} mais
                  </text>
                )}
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
    </>
  );
}
