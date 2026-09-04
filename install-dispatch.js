const fs = require("fs");
const path = require("path");

const candidates = [
  path.join(process.cwd(), "backend", "server.js"),
  path.join(process.cwd(), "backend", "app.js"),
  path.join(process.cwd(), "backend", "index.js"),
];
const serverPath = candidates.find((file) => fs.existsSync(file));
if (!serverPath) throw new Error("Aucun backend/server.js, backend/app.js ou backend/index.js trouvé.");

let code = fs.readFileSync(serverPath, "utf8");
if (!code.includes("./routes/dispatchRoutes")) {
  const regex = /const\s+orderRoutes\s*=\s*require\(\s*["']\.\/routes\/orderRoutes["']\s*\)\s*;/m;
  const match = code.match(regex);
  if (!match) throw new Error("Import orderRoutes introuvable.");
  code = code.replace(regex, `${match[0]}\n\nconst dispatchRoutes = require("./routes/dispatchRoutes");`);
}
if (!code.includes('"/api/dispatch"') && !code.includes("'/api/dispatch'")) {
  const regex = /app\.use\(\s*["']\/api\/orders["']\s*,\s*orderRoutes\s*\)\s*;/m;
  const match = code.match(regex);
  if (!match) throw new Error("app.use('/api/orders', orderRoutes) introuvable.");
  code = code.replace(regex, `${match[0]}\n\napp.use("/api/dispatch", dispatchRoutes);`);
}
fs.writeFileSync(serverPath, code, "utf8");
console.log(`✅ Dispatch Center branché dans ${serverPath}`);
