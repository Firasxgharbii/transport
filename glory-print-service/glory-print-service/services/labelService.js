const PDFDocument = require("pdfkit");
const bwipjs = require("bwip-js");
const QRCode = require("qrcode");

const PAGE_W = 4 * 72;
const PAGE_H = 6 * 72;
const SAFE = 14;

function text(value, fallback = "") {
  return value === undefined || value === null ? fallback : String(value);
}

function packageReference(order, pkg, index) {
  return text(pkg?.barcode) || `${text(order?.order_number, "GLY")}-P${String(index + 1).padStart(3, "0")}`;
}

async function barcodePng(value) {
  return bwipjs.toBuffer({
    bcid: "code128",
    text: value,
    scale: 2,
    height: 11,
    includetext: false,
    paddingwidth: 0,
    paddingheight: 0,
  });
}

async function qrPng(value) {
  return QRCode.toBuffer(value, {
    type: "png",
    width: 180,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}

function addressLines(stop, unit) {
  const lines = [];
  if (stop?.company_name) lines.push(stop.company_name);
  if (stop?.contact_name) lines.push(stop.contact_name);
  if (stop?.address) lines.push(stop.address);
  if (unit) lines.push(`Unité / suite : ${unit}`);
  const cityLine = [stop?.city, stop?.province, stop?.postal_code].filter(Boolean).join(", ");
  if (cityLine) lines.push(cityLine);
  if (stop?.phone) lines.push(stop.phone);
  return lines.slice(0, 5);
}

async function buildLabelPdf({ order, packages, trackingBaseUrl }) {
  if (!order?.order_number) throw new Error("Numéro de commande manquant.");
  if (!Array.isArray(packages) || packages.length === 0) {
    throw new Error("Aucun colis disponible pour cette commande.");
  }

  const pickup = (order.stops || []).find((s) => s.stop_type === "pickup") || {
    address: order.pickup_address,
  };
  const delivery = (order.stops || []).find((s) => s.stop_type === "delivery") || {
    address: order.delivery_address,
    company_name: order.company_name,
    contact_name: order.contact_name,
    phone: order.contact_phone,
  };

  const doc = new PDFDocument({
    autoFirstPage: false,
    size: [PAGE_W, PAGE_H],
    margin: 0,
    compress: true,
    info: {
      Title: `Glory Solutions - ${order.order_number}`,
      Author: "Glory Solutions",
      Subject: "Étiquette d’expédition 4x6",
    },
  });

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  for (let index = 0; index < packages.length; index += 1) {
    const pkg = packages[index];
    const ref = packageReference(order, pkg, index);
    const trackingUrl = `${String(trackingBaseUrl || "").replace(/\/+$/, "")}/track/${encodeURIComponent(order.order_number)}`;
    const [barcode, qr] = await Promise.all([barcodePng(ref), qrPng(trackingUrl || ref)]);

    doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 });

    // Border / safe area
    doc.rect(6, 6, PAGE_W - 12, PAGE_H - 12).lineWidth(1).stroke("#111111");

    doc.font("Helvetica-Bold").fontSize(17).text("GLORY SOLUTIONS", SAFE, 14, {
      width: PAGE_W - SAFE * 2,
      align: "center",
    });
    doc.font("Helvetica").fontSize(7.5).text("EXPÉDITION • LIVRAISON", SAFE, 34, {
      width: PAGE_W - SAFE * 2,
      align: "center",
      characterSpacing: 1,
    });

    doc.moveTo(SAFE, 48).lineTo(PAGE_W - SAFE, 48).stroke();

    doc.font("Helvetica-Bold").fontSize(13).text(order.order_number, SAFE, 56, {
      width: 185,
    });
    doc.font("Helvetica-Bold").fontSize(11).text(`${index + 1} / ${packages.length}`, PAGE_W - 65, 57, {
      width: 48,
      align: "right",
    });

    doc.font("Helvetica-Bold").fontSize(7).text("DE", SAFE, 82);
    doc.font("Helvetica").fontSize(8.2);
    let y = 94;
    for (const line of addressLines(pickup)) {
      doc.text(text(line), SAFE, y, { width: PAGE_W - SAFE * 2, height: 12, ellipsis: true });
      y += 11;
    }

    y = 153;
    doc.moveTo(SAFE, y - 8).lineTo(PAGE_W - SAFE, y - 8).stroke();
    doc.font("Helvetica-Bold").fontSize(8).text("À / DESTINATAIRE", SAFE, y);
    y += 14;
    doc.font("Helvetica-Bold").fontSize(10);
    for (const line of addressLines(delivery, order.delivery_unit)) {
      doc.text(text(line), SAFE, y, { width: PAGE_W - SAFE * 2, height: 13, ellipsis: true });
      y += 12;
    }

    y = 232;
    doc.moveTo(SAFE, y - 8).lineTo(PAGE_W - SAFE, y - 8).stroke();

    const typeLabel = text(pkg.package_type).toLowerCase() === "pallet" ? "PALETTE" : "BOÎTE";
    const weight = pkg.weight ? `${pkg.weight} ${text(pkg.weight_unit, "")}` : "—";
    const dims = [pkg.length, pkg.width, pkg.height].every((v) => v !== null && v !== undefined && v !== "")
      ? `${pkg.length} × ${pkg.width} × ${pkg.height} ${text(pkg.dimension_unit, "")}`
      : "Dimensions non précisées";

    doc.font("Helvetica-Bold").fontSize(9).text(typeLabel, SAFE, y);
    doc.font("Helvetica").fontSize(8).text(`Poids : ${weight}`, SAFE + 75, y);
    doc.text(dims, SAFE, y + 15, { width: PAGE_W - SAFE * 2 });

    doc.image(barcode, SAFE + 6, 275, {
      fit: [PAGE_W - (SAFE + 6) * 2, 62],
      align: "center",
    });
    doc.font("Helvetica-Bold").fontSize(9).text(ref, SAFE, 337, {
      width: PAGE_W - SAFE * 2,
      align: "center",
    });

    doc.image(qr, PAGE_W - 72, 358, { fit: [52, 52] });
    doc.font("Helvetica").fontSize(6.5).text("SCAN SUIVI", PAGE_W - 75, 413, {
      width: 58,
      align: "center",
    });

    doc.font("Helvetica-Bold").fontSize(8).text("GLORY SOLUTIONS", SAFE, 370, { width: 165 });
    doc.font("Helvetica").fontSize(6.8).text("Étiquette 4 × 6 po • 101,6 × 152,4 mm", SAFE, 386, { width: 165 });
    doc.text("Conserver le code-barres lisible et non plié.", SAFE, 398, { width: 165 });
  }

  doc.end();
  return done;
}

async function buildTestLabelPdf(printerName = "Imprimante") {
  return buildLabelPdf({
    order: {
      order_number: "GLY-TEST-4X6",
      pickup_address: "Glory Solutions — Adresse test",
      delivery_address: "Destination test",
      delivery_unit: null,
      stops: [
        { stop_type: "pickup", company_name: "GLORY SOLUTIONS", address: "Adresse de ramassage test", city: "Montréal", province: "QC", postal_code: "H1H 1H1" },
        { stop_type: "delivery", contact_name: printerName, address: "Adresse de livraison test", city: "Montréal", province: "QC", postal_code: "H2H 2H2" },
      ],
    },
    packages: [{
      barcode: "GLY-TEST-4X6-P001",
      package_number: 1,
      package_type: "box",
      weight: 10,
      weight_unit: "lb",
      length: 12,
      width: 8,
      height: 6,
      dimension_unit: "in",
    }],
    trackingBaseUrl: "https://example.invalid",
  });
}

module.exports = { buildLabelPdf, buildTestLabelPdf, PAGE_W, PAGE_H };
