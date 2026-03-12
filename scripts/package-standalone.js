/**
 * Post-build script: copies static + public into .next/standalone,
 * then creates deploy.zip in the project root.
 *
 * Usage: node scripts/package-standalone.js
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");
const zipPath = path.join(root, "deploy.zip");

// 1. Copy .next/static -> .next/standalone/.next/static
const srcStatic = path.join(root, ".next", "static");
const destStatic = path.join(standalone, ".next", "static");
if (fs.existsSync(srcStatic)) {
  copyDirSync(srcStatic, destStatic);
  console.log("Copied .next/static -> standalone/.next/static");
} else {
  console.warn("WARNING: .next/static not found - skipping");
}

// 2. Copy public -> .next/standalone/public
const srcPublic = path.join(root, "public");
const destPublic = path.join(standalone, "public");
if (fs.existsSync(srcPublic)) {
  copyDirSync(srcPublic, destPublic);
  console.log("Copied public -> standalone/public");
} else {
  console.warn("WARNING: public folder not found - skipping");
}

// 3. Create deploy.zip using Windows tar.exe (bsdtar, built into Windows 10+)
//    tar with .zip extension auto-selects zip format via -a flag
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
try {
  execSync(`tar.exe -a -cf "${zipPath}" -C "${standalone}" .`, {
    stdio: "inherit",
  });
  const sizeMB = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(1);
  console.log(`Created deploy.zip (${sizeMB} MB)`);
} catch (err) {
  console.error("Failed to create zip:", err.message);
  process.exit(1);
}

// -- helpers --
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
