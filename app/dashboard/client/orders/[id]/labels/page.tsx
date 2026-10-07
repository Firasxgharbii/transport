"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import JsBarcode from "jsbarcode";
import { gloryLocalPrint, gloryPrintValue } from "../../../../../lib/glory-local-print";

type OrderPackage = {
  id: number;
  order_id: number;
  barcode: string | null;
  package_number: number;
  package_type: string | null;
  description: string | null;
  weight: number | string | null;
  weight_unit: string | null;
  length: number | string | null;
  width: number | string | null;
  height: number | string | null;
  dimension_unit: string | null;
  current_status: string | null;
};

type OrderStop = {
  id: number;
  stop_order: number;
  stop_type: string;
  customer_name?: string | null;
  company_name?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
};

type Order = {
  id: number;
  order_number: string;
  client_id: number;
  pickup_address?: string | null;
  delivery_address?: string | null;
  client_name?: string | null;
  client_first_name?: string | null;
  client_last_name?: string | null;
  company_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  client_address?: string | null;
  client_city?: string | null;
  client_province?: string | null;
  client_postal_code?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_extension?: string | null;
  delivery_unit?: string | null;
  service_level?: string | null;
  created_at?: string | null;
  packages?: OrderPackage[];
  stops?: OrderStop[];
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function person(first?: string | null, last?: string | null) {
  return [clean(first), clean(last)].filter(Boolean).join(" ");
}

function findStop(stops: OrderStop[] | undefined, type: string) {
  if (!Array.isArray(stops)) return undefined;
  return stops.find(
    (stop) => clean(stop.stop_type).toLowerCase() === type.toLowerCase()
  );
}

function packageLabel(pkg: OrderPackage) {
  return clean(pkg.package_type).toLowerCase() === "pallet" ? "Palette" : "Boîte";
}

export default function LabelsPage() {
  const params = useParams();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const orderId = Number(rawId);

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [printingId, setPrintingId] = useState<number | null>(null);
  const [printingAll, setPrintingAll] = useState(false);

  const packages = useMemo(() => {
    if (!Array.isArray(order?.packages)) return [];
    return [...order.packages].sort(
      (a, b) => Number(a.package_number || 0) - Number(b.package_number || 0)
    );
  }, [order]);

  const pickupStop = useMemo(() => findStop(order?.stops, "pickup"), [order]);
  const deliveryStop = useMemo(() => findStop(order?.stops, "delivery"), [order]);

  const loadOrder = useCallback(async () => {
    if (!Number.isInteger(orderId) || orderId <= 0) {
      setError("Identifiant de commande invalide.");
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("glory_token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      setLoading(true);
      setError("");

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const response = await fetch(`${apiUrl}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("glory_token");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload?.message || payload?.error || "Impossible de récupérer la commande."
        );
      }

      const receivedOrder = payload?.order || payload?.data || payload;

      if (!receivedOrder || Number(receivedOrder.id) !== orderId) {
        throw new Error("Les données de la commande sont invalides.");
      }

      setOrder(receivedOrder);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Impossible de récupérer la commande."
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  function buildPrintPayload(pkg: OrderPackage) {
    if (!order) throw new Error("Commande introuvable.");

    const reference =
      clean(pkg.barcode) ||
      `${order.order_number}-P${String(pkg.package_number || 1).padStart(3, "0")}`;

    const senderName =
      clean(pickupStop?.company_name) ||
      clean(pickupStop?.customer_name) ||
      clean(order.client_name) ||
      clean(order.company_name) ||
      person(order.client_first_name, order.client_last_name) ||
      "EXPÉDITEUR";

    const pickupName =
      clean(pickupStop?.contact_name) ||
      clean(pickupStop?.customer_name) ||
      clean(order.client_name) ||
      senderName;

    const recipientName =
      clean(deliveryStop?.contact_name) ||
      clean(deliveryStop?.customer_name) ||
      clean(order.contact_name) ||
      clean(deliveryStop?.company_name) ||
      clean(order.company_name) ||
      "DESTINATAIRE";

    return {
      reference,
      orderId: order.order_number,

      senderName,
      pickupName,
      pickupAddress:
        clean(pickupStop?.address) ||
        clean(order.pickup_address) ||
        clean(order.client_address),
      pickupCity: clean(pickupStop?.city) || clean(order.client_city),
      pickupProvince:
        clean(pickupStop?.province) || clean(order.client_province),
      pickupPostalCode:
        clean(pickupStop?.postal_code) || clean(order.client_postal_code),
      pickupPhone: clean(pickupStop?.phone) || clean(order.client_phone),

      recipientName,
      deliveryAddress:
        clean(deliveryStop?.address) || clean(order.delivery_address),
      deliveryCity: clean(deliveryStop?.city),
      deliveryProvince: clean(deliveryStop?.province),
      deliveryPostalCode: clean(deliveryStop?.postal_code),
      deliveryPhone: clean(deliveryStop?.phone) || clean(order.contact_phone),

      packageNumber: Number(pkg.package_number) || 1,
      totalPackages: packages.length || 1,
      packageType: clean(pkg.package_type || "box").toUpperCase(),
      weight: pkg.weight ?? null,
      weightUnit: pkg.weight_unit || "lb",
      length: pkg.length ?? null,
      width: pkg.width ?? null,
      height: pkg.height ?? null,
      dimensionUnit: pkg.dimension_unit || "in",
      serviceLevel: order.service_level || "standard",
      createdAt: order.created_at || null,
    };
  }

  async function printThermalPackage(pkg: OrderPackage) {
    if (!order || printingAll || printingId !== null) return;
    if (!window.confirm(`Imprimer UNE étiquette MUNBYN pour le colis ${pkg.package_number} de ${order.order_number} ?`)) return;
    setPrintingId(pkg.id);
    setError("");
    try {
      const data = buildPrintPayload(pkg);
      const fields = order as Order & Record<string, unknown>;
      const field = (...keys: string[]) => {
        for (const key of keys) {
          const value = gloryPrintValue(fields[key]);
          if (value) return value;
        }
        return "";
      };
      const pickupAddress = [data.pickupAddress, data.pickupCity, data.pickupProvince, data.pickupPostalCode].filter(Boolean).join(", ");
      const deliveryAddress = [data.deliveryAddress, data.deliveryCity, data.deliveryProvince, data.deliveryPostalCode].filter(Boolean).join(", ");
      const weight = Number(pkg.weight);
      // TSPL attend des kg : convertir les livres si nécessaire.
      const weightKg = Number.isFinite(weight) && weight > 0
        ? (clean(pkg.weight_unit).toLowerCase() === "lb" || clean(pkg.weight_unit).toLowerCase() === "lbs"
          ? (weight * 0.45359237).toFixed(2) : String(weight)) : "";
      const result = await gloryLocalPrint({
        reference: order.order_number,
        orderId: order.id,
        packageBarcode: data.reference,
        senderName: data.senderName,
        pickupAddress,
        senderPhone: data.pickupPhone,
        recipientName: data.recipientName,
        deliveryAddress,
        recipientPhone: data.deliveryPhone,
        routeCode: field("routeCode", "route_code"),
        sector: field("sector", "sector_name"),
        stopNumber: field("stopNumber", "stop_position"),
        packageText: `${data.packageNumber} / ${data.totalPackages}`,
        weight: weightKg,
        deliveryDate: clean(order.created_at).slice(0, 10).replaceAll("-", "/") || "-",
        trackingUrl: `https://glorysolutions.ca/tracking?ref=${encodeURIComponent(order.order_number)}`,
      });
      window.alert(`Colis ${data.packageNumber} transmis à ${result.printer || "MUNBYN"}. Vérifiez l'étiquette physique.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impression MUNBYN impossible.");
    } finally { setPrintingId(null); }
  }

  function printLabels(selectedPackages: OrderPackage[]) {
    if (!order || selectedPackages.length === 0) {
      throw new Error("Aucun colis à imprimer.");
    }

    // Ouvrir immédiatement pendant le clic pour éviter le bloqueur de popups.
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      throw new Error(
        "Chrome a bloqué la fenêtre d'impression. Autorisez les popups pour Glory Solutions."
      );
    }

    try {
      const escapeHtml = (value: unknown) =>
        clean(value)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");

      const labels = selectedPackages.map((pkg) => {
        const data = buildPrintPayload(pkg);
        const barcode = clean(pkg.barcode);

        if (!barcode) {
          throw new Error(
            `Le colis ${pkg.package_number} n'a pas de code-barres enregistré.`
          );
        }

        const canvas = document.createElement("canvas");

        JsBarcode(canvas, barcode, {
          format: "CODE128",
          displayValue: false,
          margin: 0,
          width: 2,
          height: 65,
          background: "#ffffff",
          lineColor: "#000000",
        });

        const barcodeImage = canvas.toDataURL("image/png");

        const destination = [
          data.deliveryCity,
          data.deliveryProvince,
          data.deliveryPostalCode,
        ].filter(Boolean).join("  ");

        return `
          <section class="label">
            <header>
              <div class="brand">GLORY SOLUTIONS</div>
              <div class="subtitle">ÉTIQUETTE D'EXPÉDITION</div>
            </header>

            <div class="recipient">
              <div class="section-title">DESTINATAIRE</div>
              <div class="recipient-name">${escapeHtml(data.recipientName)}</div>
              <div>${escapeHtml(data.deliveryAddress)}</div>
              <div>${escapeHtml(destination)}</div>
              ${
                data.deliveryPhone
                  ? `<div>TÉL : ${escapeHtml(data.deliveryPhone)}</div>`
                  : ""
              }
            </div>

            <div class="shipment">
              <div><strong>COMMANDE :</strong> ${escapeHtml(order.order_number)}</div>
              <div>
                ${escapeHtml(packageLabel(pkg))}
                ${escapeHtml(data.packageNumber)}/${escapeHtml(data.totalPackages)}
              </div>
              <div>
                <strong>POIDS :</strong>
                ${escapeHtml(data.weight ?? "-")}
                ${escapeHtml(data.weightUnit)}
              </div>
            </div>

            <div class="barcode-area">
              <img
                src="${barcodeImage}"
                alt="Code-barres ${escapeHtml(barcode)}"
              />
              <div class="barcode-text">${escapeHtml(barcode)}</div>
            </div>

            <footer>GLORY SOLUTIONS | 4 × 6</footer>
          </section>
        `;
      }).join("");

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Glory Solutions — Étiquettes</title>
<style>
  @page {
    size: 4in 6in;
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: white;
    color: black;
    font-family: Arial, Helvetica, sans-serif;
  }

  .label {
    width: 4in;
    height: 5.72in;
    padding: 0.19in;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .label:last-child {
    page-break-after: auto;
    break-after: auto;
  }

  header {
    border-bottom: 2px solid black;
    padding-bottom: 9px;
  }

  .brand {
    font-size: 21px;
    font-weight: 900;
    letter-spacing: -0.5px;
  }

  .subtitle {
    margin-top: 3px;
    font-size: 10px;
    letter-spacing: 1px;
  }

  .recipient {
    margin-top: 14px;
    min-height: 1.85in;
    font-size: 13px;
    line-height: 1.38;
    overflow-wrap: anywhere;
  }

  .section-title {
    font-size: 12px;
    font-weight: 900;
    margin-bottom: 9px;
  }

  .recipient-name {
    font-size: 15px;
    font-weight: 900;
    margin-bottom: 5px;
  }

  .shipment {
    border-top: 2px solid black;
    padding-top: 10px;
    font-size: 12px;
    line-height: 1.65;
    overflow-wrap: anywhere;
  }

  .barcode-area {
    position: absolute;
    left: 0.19in;
    right: 0.19in;
    bottom: 0.40in;
    text-align: center;
  }

  .barcode-area img {
    display: block;
    width: 100%;
    height: 0.78in;
    object-fit: fill;
  }

  .barcode-text {
    margin-top: 7px;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 0.3px;
    overflow-wrap: anywhere;
  }

  footer {
    position: absolute;
    bottom: 0.13in;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 9px;
  }

  @media screen {
    body {
      background: #eeeeee;
    }

    .label {
      background: white;
      margin: 15px auto;
      box-shadow: 0 3px 15px #0002;
    }
  }

  @media print {
    html, body {
      width: 4in;
      background: white;
    }

    .label {
      margin: 0.025in auto 0;
      box-shadow: none;
    }
  }
</style>
</head>
<body>
${labels}
<script>
  window.addEventListener("load", function () {
    var images = Array.from(document.images);

    Promise.all(
      images.map(function (image) {
        if (image.complete) return Promise.resolve();

        return new Promise(function (resolve) {
          image.onload = resolve;
          image.onerror = resolve;
        });
      })
    ).then(function () {
      window.focus();
      window.print();
    });
  });
<\/script>
</body>
</html>`;

      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      printWindow.close();
      throw error;
    }
  }

  function printOne(pkg: OrderPackage) {
    if (printingAll || printingId !== null) return;

    try {
      setPrintingId(pkg.id);
      printLabels([pkg]);
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : "Impossible d'imprimer l'étiquette."
      );
    } finally {
      setPrintingId(null);
    }
  }

  function printAll() {
    if (printingAll || printingId !== null || packages.length === 0) return;

    try {
      setPrintingAll(true);
      printLabels(packages);
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : "Impossible d'imprimer les étiquettes."
      );
    } finally {
      setPrintingAll(false);
    }
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>Chargement de la commande…</div>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <div style={cardStyle}>
            <h1 style={titleStyle}>Étiquettes</h1>
            <p style={errorStyle}>{error || "Commande introuvable."}</p>
            <button style={secondaryButtonStyle} onClick={() => history.back()}>
              Retour
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <div style={topBarStyle}>
          <div>
            <p style={eyebrowStyle}>Glory Solutions</p>
            <h1 style={titleStyle}>Étiquettes d’expédition</h1>
            <p style={subtitleStyle}>
              Commande <strong>{order.order_number}</strong>
            </p>
          </div>

          <button
            style={secondaryButtonStyle}
            onClick={() => (window.location.href = "/dashboard/client/orders")}
          >
            Mes commandes
          </button>
        </div>

        {packages.length === 0 ? (
          <div style={cardStyle}>
            <h2 style={packageTitleStyle}>Aucun colis</h2>
            <p style={mutedStyle}>
              Aucun colis n’est enregistré pour cette commande.
            </p>
          </div>
        ) : (
          <>
            <div style={summaryCardStyle}>
              <div>
                <span style={summaryLabelStyle}>Commande</span>
                <strong style={summaryValueStyle}>{order.order_number}</strong>
              </div>
              <div>
                <span style={summaryLabelStyle}>Unités</span>
                <strong style={summaryValueStyle}>{packages.length}</strong>
              </div>
              <div>
                <span style={summaryLabelStyle}>Service</span>
                <strong style={summaryValueStyle}>
                  {clean(order.service_level || "standard").replaceAll("_", " ")}
                </strong>
              </div>
            </div>

            <div style={listStyle}>
              {packages.map((pkg, index) => {
                const busy = printingAll || printingId === pkg.id;
                const dimensions = [pkg.length, pkg.width, pkg.height]
                  .map((v) => clean(v) || "-")
                  .join(" × ");

                return (
                  <section key={pkg.id} style={cardStyle}>
                    <div style={packageHeaderStyle}>
                      <div>
                        <p style={packageIndexStyle}>
                          {packageLabel(pkg)} {index + 1}/{packages.length}
                        </p>
                        <h2 style={packageTitleStyle}>
                          {clean(pkg.barcode) ||
                            `${order.order_number}-P${String(
                              pkg.package_number || index + 1
                            ).padStart(3, "0")}`}
                        </h2>
                      </div>

                      <span style={statusBadgeStyle}>
                        {clean(pkg.current_status || "created").toUpperCase()}
                      </span>
                    </div>

                    <div style={detailsGridStyle}>
                      <Detail label="Poids" value={`${clean(pkg.weight) || "-"} ${pkg.weight_unit || "lb"}`} />
                      <Detail
                        label="Dimensions"
                        value={`${dimensions} ${pkg.dimension_unit || "in"}`}
                      />
                      <Detail label="Type" value={packageLabel(pkg)} />
                      <Detail
                        label="Numéro"
                        value={`${pkg.package_number || index + 1}/${packages.length}`}
                      />
                    </div>

                    <button
                      type="button"
                      disabled={busy}
                      style={{
                        ...primaryButtonStyle,
                        opacity: busy ? 0.6 : 1,
                        cursor: busy ? "not-allowed" : "pointer",
                      }}
                      onClick={() => printOne(pkg)}
                    >
                      {printingId === pkg.id ? "Impression…" : "Imprimer l’étiquette (navigateur)"}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      style={{ ...primaryButtonStyle, marginTop: 8, opacity: busy ? 0.6 : 1 }}
                      onClick={() => { void printThermalPackage(pkg); }}
                    >
                      Imprimer sur MUNBYN (4×6)
                    </button>
                  </section>
                );
              })}
            </div>

            <div style={bottomActionsStyle}>
              <button
                type="button"
                disabled={printingAll || printingId !== null}
                style={{
                  ...primaryButtonStyle,
                  opacity: printingAll || printingId !== null ? 0.6 : 1,
                }}
                onClick={printAll}
              >
                {printingAll
                  ? "Impression en cours…"
                  : `Imprimer toutes les étiquettes (${packages.length})`}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailStyle}>
      <span style={summaryLabelStyle}>{label}</span>
      <strong style={detailValueStyle}>{value}</strong>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  padding: "40px",
  background: "#f6f6f8",
  color: "#17171c",
};

const containerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "1000px",
  margin: "0 auto",
};

const topBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: "18px",
  marginBottom: "26px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 7px",
  color: "#ff003d",
  fontSize: "11px",
  fontWeight: 900,
  letterSpacing: "2px",
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "34px",
  fontWeight: 900,
};

const subtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#777781",
  fontSize: "14px",
};

const summaryCardStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "16px",
  padding: "20px",
  marginBottom: "18px",
  background: "#17171c",
  color: "#fff",
  borderRadius: "16px",
};

const summaryLabelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "5px",
  color: "#90909a",
  fontSize: "10px",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: ".08em",
};

const summaryValueStyle: React.CSSProperties = {
  display: "block",
  fontSize: "14px",
  fontWeight: 900,
  textTransform: "capitalize",
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: "16px",
};

const cardStyle: React.CSSProperties = {
  padding: "24px",
  background: "#fff",
  border: "1px solid #e7e7ec",
  borderRadius: "18px",
  boxShadow: "0 10px 30px rgba(0,0,0,.035)",
};

const packageHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  flexWrap: "wrap",
  gap: "14px",
  marginBottom: "20px",
};

const packageIndexStyle: React.CSSProperties = {
  margin: "0 0 5px",
  color: "#ff003d",
  fontSize: "11px",
  fontWeight: 900,
  textTransform: "uppercase",
};

const packageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "20px",
  fontWeight: 900,
  overflowWrap: "anywhere",
};

const statusBadgeStyle: React.CSSProperties = {
  padding: "6px 9px",
  borderRadius: "8px",
  background: "#f1f1f4",
  color: "#5f5f68",
  fontSize: "9px",
  fontWeight: 900,
};

const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "12px",
  marginBottom: "20px",
};

const detailStyle: React.CSSProperties = {
  padding: "13px",
  background: "#f8f8fa",
  borderRadius: "11px",
};

const detailValueStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 900,
};

const primaryButtonStyle: React.CSSProperties = {
  minHeight: "48px",
  padding: "0 22px",
  border: 0,
  borderRadius: "12px",
  background: "#ff003d",
  color: "#fff",
  fontSize: "13px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: "46px",
  padding: "0 20px",
  border: "1px solid #ddddE4",
  borderRadius: "12px",
  background: "#fff",
  color: "#25252b",
  fontSize: "13px",
  fontWeight: 800,
  cursor: "pointer",
};

const bottomActionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  marginTop: "20px",
  paddingBottom: "30px",
};

const mutedStyle: React.CSSProperties = {
  color: "#777781",
  fontSize: "13px",
};

const errorStyle: React.CSSProperties = {
  color: "#b42318",
  fontSize: "13px",
};