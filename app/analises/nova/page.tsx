import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";

const numero = (campo: string) =>
  z
    .string()
    .trim()
    .min(1, `Informe ${campo}.`)
    .transform((s) => s.replace(",", "."))
    .pipe(z.coerce.number({ invalid_type_error: `${campo} deve ser numérico.` }));

const data = (campo: string) =>
  z
    .string()
    .min(1, `Informe ${campo}.`)
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${campo} inválida.`);

const esquema = z
  .object({
    titulo: z.string().trim().min(3, "O título precisa de pelo menos 3 caracteres.").max(150),
    indicador: z.string().trim().min(1, "Informe o indicador.").max(80),
    periodo_inicio: data("o início do período"),
    periodo_fim: data("o fim do período"),
    baseline: numero("o baseline"),
    meta: numero("a meta"),
    efeito: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((s) => (s ? s : null)),
  })
  .refine((d) => d.periodo_fim >= d.periodo_inicio, {
    message: "O fim do período deve ser igual ou posterior ao início.",
    path: ["periodo_fim"],
  });

async function criarAnalise(formData: FormData) {
  "use server";

  const resultado = esquema.safeParse({
    titulo: formData.get("titulo"),
    indicador: formData.get("indicador"),
    periodo_inicio: formData.get("periodo_inicio"),
    periodo_fim: formData.get("periodo_fim"),
    baseline: formData.get("baseline"),
    meta: formData.get("meta"),
    efeito: formData.get("efeito") ?? undefined,
  });

  if (!resultado.success) {
    const primeiro = resultado.error.issues[0]?.message ?? "Dados inválidos.";
    redirect(`/analises/nova?erro=${encodeURIComponent(primeiro)}`);
  }

  const supabase = createClient(await cookies());
  const { data: criada, error } = await supabase
    .from("analises")
    .insert(resultado.data)
    .select("id")
    .single();

  if (error || !criada) {
    redirect(
      `/analises/nova?erro=${encodeURIComponent(error?.message ?? "Não foi possível salvar a análise.")}`,
    );
  }

  redirect(`/analises/${criada.id}`);
}

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

      {erro && (
        <p role="alert" className="erro" style={{ marginTop: "1rem" }}>
          {erro}
        </p>
      )}

      <form action={criarAnalise} className="card form-analise">
        <label className="campo">
          <span>Título</span>
          <input name="titulo" required minLength={3} maxLength={150} placeholder="Ex.: Tempo de ciclo de histórias" />
        </label>

        <label className="campo">
          <span>Indicador</span>
          <input name="indicador" required maxLength={80} placeholder="Ex.: Tempo de ciclo (dias)" />
        </label>

        <div className="linha-dupla">
          <label className="campo">
            <span>Início do período</span>
            <input type="date" name="periodo_inicio" required />
          </label>
          <label className="campo">
            <span>Fim do período</span>
            <input type="date" name="periodo_fim" required />
          </label>
        </div>

        <div className="linha-dupla">
          <label className="campo">
            <span>Baseline</span>
            <input name="baseline" required inputMode="decimal" placeholder="Ex.: 8.5" />
          </label>
          <label className="campo">
            <span>Meta</span>
            <input name="meta" required inputMode="decimal" placeholder="Ex.: 5" />
          </label>
        </div>

        <label className="campo">
          <span>Efeito observado (opcional)</span>
          <textarea name="efeito" rows={3} maxLength={500} placeholder="O que acontece hoje que motiva a análise" />
        </label>

        <div className="acoes-form">
          <Link href="/analises" className="muted">
            Cancelar
          </Link>
          <button type="submit">Criar análise</button>
        </div>
      </form>
    </>
  );
}
