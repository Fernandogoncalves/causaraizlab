"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  DIMENSOES,
  RESPOSTAS_RISCO,
  STATUS_ACAO,
  STATUS_HIPOTESE,
  STATUS_RISCO,
  inteiroObrigatorio,
  inteiroOpcional,
  lerAnalise,
  numeroOpcional,
  texto,
  textoOpcional,
  type Dimensao,
  type RespostaRisco,
  type StatusAcao,
  type StatusHipotese,
  type StatusRisco,
} from "@/lib/dominios";

const supabase = async () => createClient(await cookies());

/** Volta para a página informada com a mensagem de erro na URL. Nunca retorna. */
function falhar(destino: string, erro: string): never {
  const sep = destino.includes("?") ? "&" : "?";
  redirect(`${destino}${sep}erro=${encodeURIComponent(erro)}`);
}

const msgBanco = (erro: { message: string } | null, padrao: string) => erro?.message ?? padrao;

// ---- Análises ----------------------------------------------------------

export async function criarAnalise(formData: FormData) {
  const r = lerAnalise(formData);
  if (!r.ok) falhar("/analises/nova", r.erro);

  const { data, error } = await (await supabase())
    .from("analises")
    .insert(r.dados)
    .select("id")
    .single();

  if (error || !data) falhar("/analises/nova", msgBanco(error, "Não foi possível salvar a análise."));
  redirect(`/analises/${data.id}`);
}

export async function editarAnalise(id: string, formData: FormData) {
  const r = lerAnalise(formData);
  if (!r.ok) falhar(`/analises/${id}/editar`, r.erro);

  const { error } = await (await supabase()).from("analises").update(r.dados).eq("id", id);
  if (error) falhar(`/analises/${id}/editar`, msgBanco(error, "Não foi possível salvar."));
  redirect(`/analises/${id}`);
}

export async function excluirAnalise(id: string) {
  const { error } = await (await supabase()).from("analises").delete().eq("id", id);
  if (error) falhar(`/analises/${id}/excluir`, msgBanco(error, "Não foi possível excluir."));
  redirect("/analises");
}

// ---- Hipóteses ---------------------------------------------------------

export async function criarHipotese(analiseId: string, formData: FormData) {
  const destino = `/analises/${analiseId}`;
  const dimensao = texto(formData, "dimensao") as Dimensao;
  const descricao = texto(formData, "descricao");
  const paiId = textoOpcional(formData, "pai_id");

  if (!DIMENSOES.includes(dimensao)) falhar(destino, "Escolha uma dimensão.");
  if (descricao.length < 3) falhar(destino, "A descrição precisa de pelo menos 3 caracteres.");

  const impacto = inteiroOpcional(formData, "impacto", 1, 5, "Impacto");
  if (!impacto.ok) falhar(destino, impacto.erro);
  const viabilidade = inteiroOpcional(formData, "viabilidade", 1, 5, "Viabilidade");
  if (!viabilidade.ok) falhar(destino, viabilidade.erro);

  const cliente = await supabase();

  // A subcausa precisa pertencer à mesma análise.
  if (paiId) {
    const { data: pai } = await cliente.from("hipoteses").select("analise_id").eq("id", paiId).maybeSingle();
    if (!pai || pai.analise_id !== analiseId) falhar(destino, "A causa-pai precisa ser da mesma análise.");
  }

  const { error } = await cliente.from("hipoteses").insert({
    analise_id: analiseId,
    dimensao,
    descricao,
    pai_id: paiId,
    status: "hipotese",
    impacto: impacto.dados,
    viabilidade: viabilidade.dados,
  });

  if (error) falhar(destino, msgBanco(error, "Não foi possível salvar a hipótese."));
  redirect(destino);
}

export async function mudarStatusHipotese(analiseId: string, hipoteseId: string, formData: FormData) {
  const destino = `/analises/${analiseId}`;
  const novo = texto(formData, "status") as StatusHipotese;
  if (!STATUS_HIPOTESE.includes(novo)) falhar(destino, "Status inválido.");

  const cliente = await supabase();

  // Validar exige ao menos uma evidência: a validação precisa ter base.
  if (novo === "validada") {
    const { count } = await cliente
      .from("evidencias")
      .select("id", { count: "exact", head: true })
      .eq("hipotese_id", hipoteseId);
    if (!count) falhar(destino, "Adicione ao menos uma evidência antes de validar a causa.");
  }

  const { error } = await cliente.from("hipoteses").update({ status: novo }).eq("id", hipoteseId);
  if (error) falhar(destino, msgBanco(error, "Não foi possível mudar o status."));
  redirect(destino);
}

// ---- Evidências --------------------------------------------------------

export async function criarEvidencia(analiseId: string, hipoteseId: string, formData: FormData) {
  const destino = `/analises/${analiseId}`;
  const descricao = texto(formData, "descricao");
  if (descricao.length < 3) falhar(destino, "A evidência precisa de pelo menos 3 caracteres.");

  const { error } = await (await supabase()).from("evidencias").insert({
    hipotese_id: hipoteseId,
    descricao,
    fonte: textoOpcional(formData, "fonte"),
  });

  if (error) falhar(destino, msgBanco(error, "Não foi possível salvar a evidência."));
  redirect(destino);
}

// ---- Ações -------------------------------------------------------------

export async function criarAcao(analiseId: string, formData: FormData) {
  const destino = `/analises/${analiseId}`;
  const causaId = texto(formData, "causa_id");
  const oQue = texto(formData, "o_que");

  if (!causaId) falhar(destino, "Escolha a causa validada que a ação ataca.");
  if (oQue.length < 3) falhar(destino, "Descreva o que será feito (pelo menos 3 caracteres).");

  const quando = textoOpcional(formData, "quando");
  if (quando && !/^\d{4}-\d{2}-\d{2}$/.test(quando)) falhar(destino, "Data de prazo inválida.");

  const quanto = numeroOpcional(formData, "quanto", "Esforço");
  if (!quanto.ok) falhar(destino, quanto.erro);

  const { error } = await (await supabase()).from("acoes").insert({
    analise_id: analiseId,
    causa_id: causaId,
    o_que: oQue,
    por_que: textoOpcional(formData, "por_que"),
    quem: textoOpcional(formData, "quem"),
    onde: textoOpcional(formData, "onde"),
    como: textoOpcional(formData, "como"),
    quando,
    quanto: quanto.dados,
    status: "planejada",
  });

  // O trigger do banco recusa causa não validada ou de outra análise.
  if (error) falhar(destino, msgBanco(error, "Não foi possível salvar a ação."));
  redirect(destino);
}

export async function mudarStatusAcao(analiseId: string, acaoId: string, formData: FormData) {
  const pedido = texto(formData, "destino");
  // Só aceita caminhos internos (evita redirecionar para outros sites).
  const destino = pedido.startsWith("/") && !pedido.startsWith("//") ? pedido : `/analises/${analiseId}`;
  const novo = texto(formData, "status") as StatusAcao;
  if (!STATUS_ACAO.includes(novo)) falhar(destino, "Status inválido.");

  const { error } = await (await supabase()).from("acoes").update({ status: novo }).eq("id", acaoId);
  if (error) falhar(destino, msgBanco(error, "Não foi possível mudar o status."));
  redirect(destino);
}

// ---- Riscos ------------------------------------------------------------

export async function criarRisco(formData: FormData) {
  const analiseId = texto(formData, "analise_id");
  const destino = `/riscos?analise=${analiseId}`;
  const descricao = texto(formData, "descricao");
  const resposta = texto(formData, "resposta") as RespostaRisco;

  if (!analiseId) falhar("/riscos", "Escolha uma análise.");
  if (descricao.length < 3) falhar(destino, "Descreva o risco (pelo menos 3 caracteres).");
  if (!RESPOSTAS_RISCO.includes(resposta)) falhar(destino, "Escolha a resposta ao risco.");

  const probabilidade = inteiroObrigatorio(formData, "probabilidade", 1, 5, "Probabilidade");
  if (!probabilidade.ok) falhar(destino, probabilidade.erro);
  const severidade = inteiroObrigatorio(formData, "severidade", 1, 5, "Severidade");
  if (!severidade.ok) falhar(destino, severidade.erro);

  const { error } = await (await supabase()).from("riscos").insert({
    analise_id: analiseId,
    hipotese_id: textoOpcional(formData, "hipotese_id"),
    descricao,
    probabilidade: probabilidade.dados,
    severidade: severidade.dados,
    resposta,
    gatilho: textoOpcional(formData, "gatilho"),
    dono: textoOpcional(formData, "dono"),
    status: "aberto",
  });

  if (error) falhar(destino, msgBanco(error, "Não foi possível salvar o risco."));
  redirect(destino);
}

export async function mudarStatusRisco(analiseId: string, riscoId: string, formData: FormData) {
  const destino = `/riscos?analise=${analiseId}`;
  const novo = texto(formData, "status") as StatusRisco;
  if (!STATUS_RISCO.includes(novo)) falhar(destino, "Status inválido.");

  const { error } = await (await supabase()).from("riscos").update({ status: novo }).eq("id", riscoId);
  if (error) falhar(destino, msgBanco(error, "Não foi possível mudar o status."));
  redirect(destino);
}

// ---- Sessão ------------------------------------------------------------

export async function sair() {
  await (await supabase()).auth.signOut();
  redirect("/login");
}
