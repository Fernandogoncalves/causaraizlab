import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {
  DashboardInterativo,
  type AcaoD,
  type AnaliseD,
  type HipD,
  type RiscoD,
} from "@/app/dashboard-interativo";

export default async function Dashboard() {
  const supabase = createClient(await cookies());
  const hoje = new Date().toISOString().slice(0, 10);

  const [analisesR, hipR, acoesR, riscosR] = await Promise.all([
    supabase
      .from("analises")
      .select("id, titulo, indicador, periodo_inicio, periodo_fim, baseline, meta, resultado_medido")
      .order("titulo"),
    supabase.from("hipoteses").select("id, analise_id, dimensao, status"),
    supabase.from("acoes").select("id, analise_id, status, quando"),
    supabase.from("riscos").select("id, analise_id, probabilidade, severidade, status"),
  ]);

  const erro = analisesR.error ?? hipR.error ?? acoesR.error ?? riscosR.error;
  if (erro) {
    return (
      <>
        <h1>Dashboard gerencial</h1>
        <p role="alert" className="erro">
          Não foi possível carregar os dados: {erro.message}
        </p>
      </>
    );
  }

  const analises: AnaliseD[] = (analisesR.data ?? []).map((a) => ({
    id: a.id,
    titulo: a.titulo,
    indicador: a.indicador,
    periodo_inicio: a.periodo_inicio,
    periodo_fim: a.periodo_fim,
    baseline: Number(a.baseline),
    meta: Number(a.meta),
    resultado_medido: a.resultado_medido === null ? null : Number(a.resultado_medido),
  }));

  return (
    <DashboardInterativo
      hoje={hoje}
      analises={analises}
      hipoteses={(hipR.data ?? []) as HipD[]}
      acoes={(acoesR.data ?? []) as AcaoD[]}
      riscos={(riscosR.data ?? []) as RiscoD[]}
    />
  );
}
