const fs = require("fs");
const path = require("path");

if (process.env.IS_CAPACITOR !== "true") process.exit(0);

const root = path.join(__dirname, "..");
const triageRoute = path.join(root, "app", "api", "triage", "route.ts");
const triageStatic = path.join(root, "app", "api", "triage", "route.static.ts");
const backup = path.join(root, "app", "api", "triage", "route.backup.ts");

if (!fs.existsSync(triageStatic)) {
  console.warn("prebuild-capacitor: route.static.ts no encontrado");
  process.exit(0);
}
fs.copyFileSync(triageRoute, backup);
fs.copyFileSync(triageStatic, triageRoute);
console.log("prebuild-capacitor: route.ts sustituido por stub para export");
