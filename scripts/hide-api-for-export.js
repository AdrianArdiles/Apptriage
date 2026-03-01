const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const apiDir = path.join(root, "app", "api");
const apiHidden = path.join(root, "app", "_api_hidden_export");

if (!fs.existsSync(apiDir)) {
  process.exit(0);
}
if (fs.existsSync(apiHidden)) {
  fs.rmSync(apiHidden, { recursive: true });
}
fs.renameSync(apiDir, apiHidden);
console.log("hide-api: app/api movido a _api_hidden_export para static export");
console.log("postbuild restaurará app/api");
