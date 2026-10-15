import Link from "next/link";
import { criarAnalise } from "@/app/actions";
import { FormAnalise } from "@/app/analises/form-analise";

export default async function NovaAnalise({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <>
      <p className="muted">
        <Link href="/analises">← Análises</Link>
      </p>
      <h1>Nova análise</h1>
      <p className="muted">Formule o problema como um desvio observável, com indicador, período, baseline e meta.</p>
      <FormAnalise
        action={criarAnalise}
        erro={erro}
        textoBotao="Criar análise"
        cancelarPara="/analises"
      />
    </>
  );
}
