const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const apiDir = path.join(root, "app", "api");
const apiHidden = path.join(root, "app", "_api_hidden_export");

if (!fs.existsSync(apiHidden)) {
  process.exit(0);
}
if (fs.existsSync(apiDir)) {
  fs.rmSync(apiDir, { recursive: true });
}
fs.renameSync(apiHidden, apiDir);
console.log("restore-api: app/api restaurado");
