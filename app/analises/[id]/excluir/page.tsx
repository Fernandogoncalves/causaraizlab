import Link from "next/link";
import { excluirAnalise } from "@/app/actions";

export default async function ExcluirAnalise({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;

  return (
    <>
      <p className="muted">
        <Link href={`/analises/${id}`}>← Voltar para a análise</Link>
      </p>
      <h1>Excluir análise</h1>
      <div className="card alerta-exclusao">
        <p>
          Esta ação apaga a análise e <strong>todas as hipóteses, evidências, ações e riscos</strong> ligados
          a ela. Não há como desfazer pelo app.
        </p>
      </div>
      {erro && (
        <p role="alert" className="erro" style={{ marginTop: "1rem" }}>
          {erro}
        </p>
      )}
      <form action={excluirAnalise.bind(null, id)} className="acoes-form" style={{ marginTop: "1.25rem" }}>
        <Link href={`/analises/${id}`} className="muted">
          Cancelar
        </Link>
        <button type="submit" className="botao-perigo">
          Excluir definitivamente
        </button>
      </form>
    </>
  );
}
