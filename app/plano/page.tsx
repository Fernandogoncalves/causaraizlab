export default function PlanoDeAcao() {
  return (
    <>
      <h1>Plano de ação</h1>
      <p className="muted">
        5W2H por contramedida, com responsável, prazo, status e medição do resultado.
        Só causas validadas podem receber ação.
      </p>
      <div className="empty" style={{ marginTop: "1.5rem" }}>
        Nenhuma ação cadastrada.
      </div>
    </>
  );
}
