import Link from "next/link";

export type ValoresFormAnalise = {
  titulo?: string;
  indicador?: string;
  periodo_inicio?: string;
  periodo_fim?: string;
  baseline?: number;
  meta?: number;
  resultado_medido?: number | null;
  efeito?: string | null;
};

/** Formulário usado para criar e editar análises. Sem estado: a validação é feita no servidor. */
export function FormAnalise({
  action,
  valores = {},
  textoBotao,
  cancelarPara,
  erro,
}: {
  action: (formData: FormData) => Promise<void>;
  valores?: ValoresFormAnalise;
  textoBotao: string;
  cancelarPara: string;
  erro?: string;
}) {
  return (
    <>
      {erro && (
        <p role="alert" className="erro" style={{ marginTop: "1rem" }}>
          {erro}
        </p>
      )}

      <form action={action} className="card form-analise">
        <label className="campo">
          <span>Título</span>
          <input name="titulo" required minLength={3} maxLength={150} defaultValue={valores.titulo} placeholder="Ex.: Tempo de ciclo de histórias" />
        </label>

        <label className="campo">
          <span>Indicador</span>
          <input name="indicador" required maxLength={80} defaultValue={valores.indicador} placeholder="Ex.: Tempo de ciclo (dias)" />
        </label>

        <div className="linha-dupla">
          <label className="campo">
            <span>Início do período</span>
            <input type="date" name="periodo_inicio" required defaultValue={valores.periodo_inicio} />
          </label>
          <label className="campo">
            <span>Fim do período</span>
            <input type="date" name="periodo_fim" required defaultValue={valores.periodo_fim} />
          </label>
        </div>

        <div className="linha-dupla">
          <label className="campo">
            <span>Baseline</span>
            <input name="baseline" required inputMode="decimal" defaultValue={valores.baseline} placeholder="Ex.: 8.5" />
          </label>
          <label className="campo">
            <span>Meta</span>
            <input name="meta" required inputMode="decimal" defaultValue={valores.meta} placeholder="Ex.: 5" />
          </label>
        </div>

        <label className="campo">
          <span>Resultado medido (opcional)</span>
          <input
            name="resultado_medido"
            inputMode="decimal"
            defaultValue={valores.resultado_medido ?? ""}
            placeholder="Valor atual do indicador, após as ações"
          />
          <small className="muted">Preencha quando houver medição. Alimenta o comparativo antes × depois do dashboard.</small>
        </label>

        <label className="campo">
          <span>Efeito observado (opcional)</span>
          <textarea name="efeito" rows={3} maxLength={500} defaultValue={valores.efeito ?? ""} placeholder="O que acontece hoje que motiva a análise" />
        </label>

        <div className="acoes-form">
          <Link href={cancelarPara} className="muted">
            Cancelar
          </Link>
          <button type="submit">{textoBotao}</button>
        </div>
      </form>
    </>
  );
}
