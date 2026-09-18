const fs = require("fs");
const path = require("path");

const storageDir = path.join(__dirname, "..", "storage");
const configPath = path.join(storageDir, "config.json");

const defaults = {
  selectedPrinter: null,
  label: {
    widthInches: 4,
    heightInches: 6,
    orientation: "portrait",
  },
};

function ensureStorage() {
  fs.mkdirSync(storageDir, { recursive: true });
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(defaults, null, 2), "utf8");
  }
}

function readConfig() {
  ensureStorage();
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(configPath, "utf8")) };
  } catch {
    return { ...defaults };
  }
}

function writeConfig(next) {
  ensureStorage();
  const merged = { ...readConfig(), ...next };
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

function setSelectedPrinter(name) {
  return writeConfig({ selectedPrinter: name });
}

module.exports = { readConfig, writeConfig, setSelectedPrinter };
