export default function ProfilePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6f6f8",
        padding: "40px",
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          background: "#fff",
          border: "1px solid #e9e8ed",
          borderRadius: 18,
          padding: 28,
          boxShadow: "0 14px 35px rgba(26,22,37,.06)",
        }}
      >
        <div
          style={{
            color: "#ff003d",
            fontWeight: 900,
            fontSize: 12,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Glory Solutions
        </div>

        <h1 style={{ margin: "0 0 10px", color: "#17141d" }}>
          Mon profil
        </h1>

        <p style={{ color: "#6f6b76", margin: 0, lineHeight: 1.6 }}>
          Les informations de votre profil servent notamment à déterminer
          automatiquement l’adresse de ramassage de vos commandes.
        </p>
      </div>
    </main>
  );
}