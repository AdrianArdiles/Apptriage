const fs = require("fs");
const path = require("path");

if (process.env.IS_CAPACITOR !== "true") process.exit(0);

const root = path.join(__dirname, "..");
const triageRoute = path.join(root, "app", "api", "triage", "route.ts");
const backup = path.join(root, "app", "api", "triage", "route.backup.ts");

if (fs.existsSync(backup)) {
  fs.copyFileSync(backup, triageRoute);
  fs.unlinkSync(backup);
  console.log("postbuild-capacitor: route.ts restaurado");
}
