type OrderDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrderDetailsPage({
  params,
}: OrderDetailsPageProps) {
  const { id } = await params;

  return (
    <main
      style={{
        padding: "40px",
      }}
    >
      <h1>Détails de la commande</h1>

      <p>
        Commande :
        {" "}
        <strong>{id}</strong>
      </p>

      <p>
        Les détails de cette commande apparaîtront ici.
      </p>
    </main>
  );
}