import Link from "next/link";

export default function ClientDashboardPage() {
  return (
    <main
      style={{
        width: "100%",
        minHeight: "100vh",
        padding: "40px",
        background: "#f6f6f8",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            color: "#ff003d",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "2px",
            textTransform: "uppercase",
          }}
        >
          Glory Solutions
        </p>

        <h1
          style={{
            margin: "0 0 10px",
            color: "#17171c",
            fontSize: "40px",
            fontWeight: 900,
          }}
        >
          Espace client
        </h1>

        <p
          style={{
            maxWidth: "700px",
            margin: "0 0 40px",
            color: "#73737d",
            fontSize: "15px",
            lineHeight: 1.7,
          }}
        >
          Consultez vos commandes, vos factures,
          vos documents et vos demandes depuis
          votre espace Glory Solutions.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "20px",
          }}
        >
          <Link
            href="/dashboard/client/orders"
            style={cardStyle}
          >
            <span style={numberStyle}>01</span>

            <h2 style={titleStyle}>
              Mes commandes
            </h2>

            <p style={textStyle}>
              Consultez vos commandes et suivez
              leur progression.
            </p>
          </Link>

          <Link
            href="/dashboard/client/invoices"
            style={cardStyle}
          >
            <span style={numberStyle}>02</span>

            <h2 style={titleStyle}>
              Mes factures
            </h2>

            <p style={textStyle}>
              Consultez vos factures et vos
              informations de facturation.
            </p>
          </Link>

          <Link
            href="/dashboard/client/documents"
            style={cardStyle}
          >
            <span style={numberStyle}>03</span>

            <h2 style={titleStyle}>
              Mes documents
            </h2>

            <p style={textStyle}>
              Retrouvez les documents associés
              à votre compte.
            </p>
          </Link>

          <Link
            href="/dashboard/client/requests"
            style={cardStyle}
          >
            <span style={numberStyle}>04</span>

            <h2 style={titleStyle}>
              Mes demandes
            </h2>

            <p style={textStyle}>
              Consultez et gérez vos demandes
              auprès de Glory Solutions.
            </p>
          </Link>

          <Link
            href="/dashboard/client/profile"
            style={cardStyle}
          >
            <span style={numberStyle}>05</span>

            <h2 style={titleStyle}>
              Mon profil
            </h2>

            <p style={textStyle}>
              Consultez et mettez à jour les
              informations de votre compte.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}

const cardStyle = {
  display: "block",
  minHeight: "190px",
  padding: "28px",
  background: "#ffffff",
  border: "1px solid #e9e9ed",
  borderRadius: "18px",
  color: "#17171c",
  textDecoration: "none",
  boxShadow: "0 10px 35px rgba(0,0,0,0.05)",
};

const numberStyle = {
  display: "block",
  marginBottom: "30px",
  color: "#ff003d",
  fontSize: "11px",
  fontWeight: 900,
};

const titleStyle = {
  margin: "0 0 10px",
  fontSize: "18px",
  fontWeight: 900,
};

const textStyle = {
  margin: 0,
  color: "#7a7a84",
  fontSize: "13px",
  lineHeight: 1.6,
};