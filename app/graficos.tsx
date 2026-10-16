// Gráficos sem biblioteca externa. Recebem os dados e avisam o clique por callback;
// quem decide o filtro é o painel (dashboard-interativo.tsx).

export type Parte = { chave: string; rotulo: string; valor: number; cor: string };

export function Donut({
  partes,
  ativo,
  onSelecionar,
  centro,
}: {
  partes: Parte[];
  ativo?: string;
  onSelecionar: (chave: string) => void;
  centro: { valor: string; sub: string };
}) {
  const total = partes.reduce((s, p) => s + p.valor, 0);
  const R = 70;
  const C = 2 * Math.PI * R;
  let acumulado = 0;

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 200 200" className="donut" role="img" aria-label="Distribuição por status">
        <circle cx={100} cy={100} r={R} fill="none" stroke="var(--grade)" strokeWidth={28} />
        {total > 0 &&
          partes.map((p) => {
            const len = (p.valor / total) * C;
            const offset = -acumulado;
            acumulado += len;
            const esmaecida = !!ativo && ativo !== p.chave;
            return (
              <circle
                key={p.chave}
                cx={100}
                cy={100}
                r={R}
                fill="none"
                stroke={p.cor}
                strokeWidth={ativo === p.chave ? 34 : 28}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={offset}
                transform="rotate(-90 100 100)"
                opacity={esmaecida ? 0.25 : 1}
                className="fatia"
                role="button"
                tabIndex={0}
                aria-label={`${p.rotulo}: ${p.valor}`}
                onClick={() => onSelecionar(p.chave)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelecionar(p.chave);
                  }
                }}
              />
            );
          })}
        <text x={100} y={98} textAnchor="middle" className="donut-valor">
          {centro.valor}
        </text>
        <text x={100} y={118} textAnchor="middle" className="donut-sub">
          {centro.sub}
        </text>
      </svg>

      <ul className="legenda-grafico">
        {partes.map((p) => (
          <li key={p.chave}>
            <button
              type="button"
              className={`legenda-item ${ativo === p.chave ? "ativa" : ""} ${ativo && ativo !== p.chave ? "esmaecida" : ""}`}
              aria-pressed={ativo === p.chave}
              onClick={() => onSelecionar(p.chave)}
            >
              <span className="ponto" style={{ background: p.cor }} />
              {p.rotulo}
              <span className="valor">{p.valor}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarrasHorizontais({
  itens,
  ativo,
  onSelecionar,
}: {
  itens: Parte[];
  ativo?: string;
  onSelecionar: (chave: string) => void;
}) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <div className="barras">
      {itens.map((i) => (
        <button
          key={i.chave}
          type="button"
          className={`barra-linha ${ativo === i.chave ? "ativa" : ""} ${ativo && ativo !== i.chave ? "esmaecida" : ""}`}
          aria-pressed={ativo === i.chave}
          onClick={() => onSelecionar(i.chave)}
        >
          <span className="barra-rotulo">{i.rotulo}</span>
          <span className="barra-trilha">
            <span className="barra-preenchimento" style={{ width: `${(i.valor / max) * 100}%`, background: i.cor }} />
          </span>
          <span className="barra-valor">{i.valor}</span>
        </button>
      ))}
    </div>
  );
}

export function BarrasEmpilhadas({
  linhas,
  ativo,
  onSelecionar,
}: {
  linhas: { chave: string; rotulo: string; segmentos: Parte[] }[];
  ativo?: string;
  onSelecionar: (chave: string) => void;
}) {
  const totais = linhas.map((l) => l.segmentos.reduce((s, x) => s + x.valor, 0));
  const max = Math.max(1, ...totais);
  return (
    <div className="barras">
      {linhas.map((l, idx) => (
        <button
          key={l.chave}
          type="button"
          className={`barra-linha ${ativo === l.chave ? "ativa" : ""} ${ativo && ativo !== l.chave ? "esmaecida" : ""}`}
          aria-pressed={ativo === l.chave}
          onClick={() => onSelecionar(l.chave)}
        >
          <span className="barra-rotulo">{l.rotulo}</span>
          <span className="barra-trilha">
            {l.segmentos
              .filter((s) => s.valor > 0)
              .map((s) => (
                <span
                  key={s.chave}
                  title={`${s.rotulo}: ${s.valor}`}
                  style={{ width: `${(s.valor / max) * 100}%`, background: s.cor }}
                />
              ))}
          </span>
          <span className="barra-valor">{totais[idx]}</span>
        </button>
      ))}
    </div>
  );
}

export function Colunas({
  itens,
  ativo,
  onSelecionar,
}: {
  itens: Parte[];
  ativo?: string;
  onSelecionar: (chave: string) => void;
}) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <div className="colunas">
      {itens.map((i) => (
        <button
          key={i.chave}
          type="button"
          className={`coluna ${ativo && ativo !== i.chave ? "esmaecida" : ""} ${ativo === i.chave ? "ativa" : ""}`}
          aria-pressed={ativo === i.chave}
          onClick={() => onSelecionar(i.chave)}
        >
          <span className="coluna-valor">{i.valor}</span>
          <span className="coluna-trilha">
            <span className="coluna-fill" style={{ height: `${(i.valor / max) * 100}%`, background: i.cor }} />
          </span>
          <span className="coluna-rotulo">{i.rotulo}</span>
        </button>
      ))}
    </div>
  );
}

export function AntesDepois({
  itens,
  ativo,
  onSelecionar,
}: {
  itens: { chave: string; rotulo: string; antes: number; depois: number; meta: number }[];
  ativo?: string;
  onSelecionar: (chave: string) => void;
}) {
  const max = Math.max(1, ...itens.flatMap((i) => [i.antes, i.depois, i.meta]));
  return (
    <div className="barras">
      {itens.map((i) => (
        <button
          key={i.chave}
          type="button"
          className={`barra-linha ${ativo === i.chave ? "ativa" : ""} ${ativo && ativo !== i.chave ? "esmaecida" : ""}`}
          aria-pressed={ativo === i.chave}
          onClick={() => onSelecionar(i.chave)}
        >
          <span className="barra-rotulo">{i.rotulo}</span>
          <span className="ad-par">
            <span className="barra-trilha">
              <span className="barra-preenchimento ad-antes" style={{ width: `${(i.antes / max) * 100}%` }} />
            </span>
            <span className="barra-trilha">
              <span className="barra-preenchimento ad-depois" style={{ width: `${(i.depois / max) * 100}%` }} />
            </span>
          </span>
          <span className="barra-valor">
            {i.antes} → {i.depois} <span className="muted">(meta {i.meta})</span>
          </span>
        </button>
      ))}
      <p className="muted grafico-nota">Cinza = antes (baseline). Verde = depois (resultado medido).</p>
    </div>
  );
}
