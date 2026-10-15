import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { editarAnalise } from "@/app/actions";
import { FormAnalise } from "@/app/analises/form-analise";
import { createClient } from "@/utils/supabase/server";

export default async function EditarAnalise({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const supabase = createClient(await cookies());

  const { data: analise, error } = await supabase
    .from("analises")
    .select("titulo, indicador, periodo_inicio, periodo_fim, baseline, meta, resultado_medido, efeito")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <p role="alert" className="erro">
        Não foi possível carregar a análise: {error.message}
      </p>
    );
  }
  if (!analise) notFound();

  return (
    <>
      <p className="muted">
        <Link href={`/analises/${id}`}>← Voltar para a análise</Link>
      </p>
      <h1>Editar análise</h1>
      <FormAnalise
        action={editarAnalise.bind(null, id)}
        valores={analise}
        erro={erro}
        textoBotao="Salvar alterações"
        cancelarPara={`/analises/${id}`}
      />
    </>
  );
}
