// Domínios compartilhados entre páginas e ações do servidor.
// Não usar "use server" aqui: este arquivo exporta constantes e funções síncronas.

export const DIMENSOES = [
  "pessoas",
  "processo",
  "ferramentas",
  "dados",
  "dependencias",
  "politicas",
  "ambiente",
] as const;
export type Dimensao = (typeof DIMENSOES)[number];

export const ROTULO_DIMENSAO: Record<Dimensao, string> = {
  pessoas: "Pessoas",
  processo: "Processo",
  ferramentas: "Ferramentas",
  dados: "Dados",
  dependencias: "Dependências",
  politicas: "Políticas",
  ambiente: "Ambiente",
};

export const STATUS_HIPOTESE = ["hipotese", "validada", "descartada"] as const;
export type StatusHipotese = (typeof STATUS_HIPOTESE)[number];
export const ROTULO_HIPOTESE: Record<StatusHipotese, string> = {
  hipotese: "Em aberto",
  validada: "Validada",
  descartada: "Descartada",
};

export const STATUS_ACAO = ["planejada", "em_andamento", "concluida", "cancelada"] as const;
export type StatusAcao = (typeof STATUS_ACAO)[number];
export const ROTULO_ACAO: Record<StatusAcao, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const STATUS_RISCO = ["aberto", "mitigado", "aceito", "fechado"] as const;
export type StatusRisco = (typeof STATUS_RISCO)[number];
export const ROTULO_RISCO: Record<StatusRisco, string> = {
  aberto: "Aberto",
  mitigado: "Mitigado",
  aceito: "Aceito",
  fechado: "Fechado",
};

export const RESPOSTAS_RISCO = ["mitigar", "aceitar", "transferir", "evitar"] as const;
export type RespostaRisco = (typeof RESPOSTAS_RISCO)[number];
export const ROTULO_RESPOSTA: Record<RespostaRisco, string> = {
  mitigar: "Mitigar",
  aceitar: "Aceitar",
  transferir: "Transferir",
  evitar: "Evitar",
};

export const formatarData = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR");

export const formatarPeriodo = (inicio: string, fim: string) =>
  `${formatarData(inicio)} a ${formatarData(fim)}`;

// ---- Validação de entrada (FormData) -----------------------------------

export type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: string };

export const texto = (f: FormData, chave: string) => (f.get(chave) ?? "").toString().trim();

export const textoOpcional = (f: FormData, chave: string) => {
  const v = texto(f, chave);
  return v === "" ? null : v;
};

// Inteiro entre min e max, opcional. Retorna erro se preenchido e inválido.
export function inteiroOpcional(
  f: FormData,
  chave: string,
  min: number,
  max: number,
  rotulo: string,
): Resultado<number | null> {
  const v = texto(f, chave);
  if (v === "") return { ok: true, dados: null };
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) {
    return { ok: false, erro: `${rotulo} deve ser um número inteiro entre ${min} e ${max}.` };
  }
  return { ok: true, dados: n };
}

export function inteiroObrigatorio(
  f: FormData,
  chave: string,
  min: number,
  max: number,
  rotulo: string,
): Resultado<number> {
  const r = inteiroOpcional(f, chave, min, max, rotulo);
  if (!r.ok) return r;
  if (r.dados === null) return { ok: false, erro: `Informe ${rotulo.toLowerCase()}.` };
  return { ok: true, dados: r.dados };
}

export function numeroObrigatorio(f: FormData, chave: string, rotulo: string): Resultado<number> {
  const v = texto(f, chave).replace(",", ".");
  if (v === "") return { ok: false, erro: `Informe ${rotulo.toLowerCase()}.` };
  const n = Number(v);
  if (!Number.isFinite(n)) return { ok: false, erro: `${rotulo} deve ser numérico.` };
  return { ok: true, dados: n };
}

export function numeroOpcional(f: FormData, chave: string, rotulo: string): Resultado<number | null> {
  if (texto(f, chave) === "") return { ok: true, dados: null };
  return numeroObrigatorio(f, chave, rotulo);
}

const dataValida = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export type DadosAnalise = {
  titulo: string;
  indicador: string;
  periodo_inicio: string;
  periodo_fim: string;
  baseline: number;
  meta: number;
  resultado_medido: number | null;
  efeito: string | null;
};

export function lerAnalise(f: FormData): Resultado<DadosAnalise> {
  const titulo = texto(f, "titulo");
  const indicador = texto(f, "indicador");
  const inicio = texto(f, "periodo_inicio");
  const fim = texto(f, "periodo_fim");

  if (titulo.length < 3) return { ok: false, erro: "O título precisa de pelo menos 3 caracteres." };
  if (titulo.length > 150) return { ok: false, erro: "O título pode ter no máximo 150 caracteres." };
  if (!indicador) return { ok: false, erro: "Informe o indicador." };
  if (!dataValida(inicio)) return { ok: false, erro: "Informe o início do período." };
  if (!dataValida(fim)) return { ok: false, erro: "Informe o fim do período." };
  if (fim < inicio) return { ok: false, erro: "O fim do período deve ser igual ou posterior ao início." };

  const baseline = numeroObrigatorio(f, "baseline", "Baseline");
  if (!baseline.ok) return baseline;
  const meta = numeroObrigatorio(f, "meta", "Meta");
  if (!meta.ok) return meta;
  const resultado = numeroOpcional(f, "resultado_medido", "Resultado medido");
  if (!resultado.ok) return resultado;

  return {
    ok: true,
    dados: {
      titulo,
      indicador,
      periodo_inicio: inicio,
      periodo_fim: fim,
      baseline: baseline.dados,
      meta: meta.dados,
      resultado_medido: resultado.dados,
      efeito: textoOpcional(f, "efeito"),
    },
  };
}
