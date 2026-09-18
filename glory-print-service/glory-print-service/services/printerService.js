const os = require("os");
const fs = require("fs");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { readConfig, setSelectedPrinter } = require("../config/configStore");

const execFileAsync = promisify(execFile);

function cleanName(value) {
  const name = String(value || "").trim();
  if (!name || name.length > 200 || /[\r\n\0]/.test(name)) {
    throw new Error("Nom d’imprimante invalide.");
  }
  return name;
}

async function run(command, args = [], options = {}) {
  const result = await execFileAsync(command, args, {
    timeout: 15000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
    ...options,
  });
  return String(result.stdout || "");
}

async function listLinuxPrinters() {
  const [status, devices] = await Promise.all([
    run("lpstat", ["-p", "-d"]).catch(() => ""),
    run("lpstat", ["-v"]).catch(() => ""),
  ]);

  const defaultMatch = status.match(/system default destination:\s*(.+)$/mi);
  const defaultName = defaultMatch ? defaultMatch[1].trim() : null;
  const deviceMap = new Map();

  for (const line of devices.split(/\r?\n/)) {
    const match = line.match(/^device for (.+?):\s*(.+)$/);
    if (match) deviceMap.set(match[1].trim(), match[2].trim());
  }

  const printers = [];
  for (const line of status.split(/\r?\n/)) {
    const match = line.match(/^printer\s+(\S+)\s+(.+)$/);
    if (!match) continue;
    const name = match[1];
    const tail = match[2];
    printers.push({
      name,
      displayName: name,
      isDefault: name === defaultName,
      status: /\bdisabled\b/i.test(tail) ? "disabled" : "available",
      uri: deviceMap.get(name) || null,
      platform: "linux",
    });
  }
  return printers;
}

async function listMacPrinters() {
  const status = await run("lpstat", ["-p", "-d"]).catch(() => "");
  const devices = await run("lpstat", ["-v"]).catch(() => "");
  const defaultMatch = status.match(/system default destination:\s*(.+)$/mi);
  const defaultName = defaultMatch ? defaultMatch[1].trim() : null;
  const deviceMap = new Map();

  for (const line of devices.split(/\r?\n/)) {
    const match = line.match(/^device for (.+?):\s*(.+)$/);
    if (match) deviceMap.set(match[1].trim(), match[2].trim());
  }

  return status.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^printer\s+(\S+)\s+(.+)$/);
    if (!match) return [];
    return [{
      name: match[1],
      displayName: match[1],
      isDefault: match[1] === defaultName,
      status: /\bdisabled\b/i.test(match[2]) ? "disabled" : "available",
      uri: deviceMap.get(match[1]) || null,
      platform: "darwin",
    }];
  });
}

async function listWindowsPrinters() {
  const script = [
    "$ErrorActionPreference='Stop'",
    "$default=(Get-CimInstance Win32_Printer | Where-Object {$_.Default -eq $true} | Select-Object -First 1 -ExpandProperty Name)",
    "Get-Printer | Select-Object Name,DriverName,PortName,PrinterStatus | ForEach-Object {",
    "  [PSCustomObject]@{name=$_.Name;displayName=$_.Name;driver=$_.DriverName;port=$_.PortName;status=[string]$_.PrinterStatus;isDefault=($_.Name -eq $default);platform='win32'}",
    "} | ConvertTo-Json -Compress",
  ].join("; ");

  const output = await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script]);
  if (!output.trim()) return [];
  const parsed = JSON.parse(output);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function listPrinters() {
  const platform = os.platform();
  let printers;
  if (platform === "win32") printers = await listWindowsPrinters();
  else if (platform === "darwin") printers = await listMacPrinters();
  else printers = await listLinuxPrinters();

  const selected = readConfig().selectedPrinter;
  return printers.map((p) => ({ ...p, selected: p.name === selected }));
}

async function selectPrinter(name) {
  const safeName = cleanName(name);
  const printers = await listPrinters();
  const found = printers.find((p) => p.name === safeName);
  if (!found) throw new Error("Cette imprimante n’est pas disponible sur cet ordinateur.");
  setSelectedPrinter(safeName);
  return { ...found, selected: true };
}

async function getSelectedPrinter() {
  const configured = readConfig().selectedPrinter;
  const printers = await listPrinters();

  if (configured) {
    const found = printers.find((p) => p.name === configured);
    if (found) return found;
  }
  return printers.find((p) => p.isDefault) || printers[0] || null;
}

async function printPdf(pdfPath, requestedPrinter = null, copies = 1) {
  if (!fs.existsSync(pdfPath)) throw new Error("Document PDF introuvable.");

  const printer = requestedPrinter
    ? await selectPrinter(requestedPrinter)
    : await getSelectedPrinter();

  if (!printer) throw new Error("Aucune imprimante disponible.");

  const safeCopies = Math.max(1, Math.min(20, Number(copies) || 1));
  const platform = os.platform();

  if (platform === "linux" || platform === "darwin") {
    // CUPS receives the PDF and lets the configured queue/driver perform rasterization.
    // We deliberately avoid hard-coding vendor-specific commands.
    const args = ["-d", cleanName(printer.name), "-n", String(safeCopies), pdfPath];
    const stdout = await run("lp", args);
    return { printer, job: stdout.trim() || "submitted" };
  }

  if (platform === "win32") {
    // Windows printing of arbitrary PDFs depends on the installed PDF handler.
    // Direct silent printing is therefore not assumed. Return a controlled fallback.
    return {
      printer,
      fallbackRequired: true,
      reason: "WINDOWS_PDF_HANDLER_REQUIRED",
      message: "Le PDF 4×6 est prêt. Utilisez l’impression système Windows pour ce poste.",
    };
  }

  throw new Error(`Plateforme non prise en charge : ${platform}`);
}

module.exports = {
  listPrinters,
  selectPrinter,
  getSelectedPrinter,
  printPdf,
};
