const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const {
  listPrinters,
  selectPrinter,
  getSelectedPrinter,
  printPdf,
} = require("../services/printerService");
const { buildLabelPdf, buildTestLabelPdf } = require("../services/labelService");

const router = express.Router();

function tempPdfPath(prefix = "glory-label") {
  return path.join(os.tmpdir(), `${prefix}-${crypto.randomUUID()}.pdf`);
}

async function withTempPdf(buffer, fn) {
  const file = tempPdfPath();
  await fs.promises.writeFile(file, buffer, { mode: 0o600 });
  try {
    return await fn(file);
  } finally {
    await fs.promises.unlink(file).catch(() => {});
  }
}

router.get("/printers", async (_req, res) => {
  try {
    res.json({ success: true, printers: await listPrinters() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/printers/default", async (_req, res) => {
  try {
    res.json({ success: true, printer: await getSelectedPrinter() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/printers/select", async (req, res) => {
  try {
    const printer = await selectPrinter(req.body?.printer);
    res.json({ success: true, printer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/printers/test", async (req, res) => {
  try {
    const requested = req.body?.printer || null;
    const printer = requested ? await selectPrinter(requested) : await getSelectedPrinter();
    if (!printer) return res.status(400).json({ success: false, message: "Aucune imprimante disponible." });

    const pdf = await buildTestLabelPdf(printer.displayName || printer.name);
    const result = await withTempPdf(pdf, (file) => printPdf(file, printer.name, 1));

    if (result.fallbackRequired) {
      res.setHeader("X-Glory-Print-Fallback", "system-dialog");
      res.type("application/pdf").send(pdf);
      return;
    }

    res.json({ success: true, message: "Étiquette test envoyée.", result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/labels/preview", async (req, res) => {
  try {
    const pdf = await buildLabelPdf({
      order: req.body?.order,
      packages: req.body?.packages,
      trackingBaseUrl: req.body?.trackingBaseUrl,
    });
    res.setHeader("Content-Disposition", 'inline; filename="glory-labels-4x6.pdf"');
    res.type("application/pdf").send(pdf);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/labels/print", async (req, res) => {
  try {
    const pdf = await buildLabelPdf({
      order: req.body?.order,
      packages: req.body?.packages,
      trackingBaseUrl: req.body?.trackingBaseUrl,
    });

    const result = await withTempPdf(pdf, (file) =>
      printPdf(file, req.body?.printer || null, req.body?.copies || 1)
    );

    if (result.fallbackRequired) {
      res.setHeader("X-Glory-Print-Fallback", "system-dialog");
      res.setHeader("Content-Disposition", 'inline; filename="glory-labels-4x6.pdf"');
      res.type("application/pdf").send(pdf);
      return;
    }

    res.json({ success: true, message: "Travail d’impression envoyé.", result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
