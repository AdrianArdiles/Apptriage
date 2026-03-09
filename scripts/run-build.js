const { execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
process.chdir(root);

const isWeb = process.env.BUILD_WEB === "1";

if (!isWeb) {
  require("./hide-api-for-export.js");
}

try {
  execSync("npx prisma generate", { stdio: "inherit" });
  execSync("next build", { stdio: "inherit", env: { ...process.env } });
} finally {
  if (!isWeb) {
    require("./restore-api-after-export.js");
  }
}
