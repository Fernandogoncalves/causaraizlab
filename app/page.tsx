export default function Dashboard() {
  return (
    <>
      <h1>Dashboard gerencial</h1>
      <p className="muted">Portfólio de análises, status do ciclo e efeito antes/depois.</p>
      <div className="empty" style={{ marginTop: "1.5rem" }}>
        Ainda não há análises. Crie a primeira na aba Análises.
      </div>
    </>
  );
}
