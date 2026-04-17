/**
 * Post-build script: copies static + public into .next/standalone,
 * then creates deploy.tar.gz in the project root.
 *
 * Usage: node scripts/package-standalone.js
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");
const archivePath = path.join(root, ".next", "deploy.tar.gz");

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

// 3. Create deploy.tar.gz — works on Linux, macOS, and Windows 10+
//    (GNU tar on Linux/macOS; bsdtar shipped as `tar` on Windows 10+)
if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
try {
  execSync(`tar -czf "${archivePath}" -C "${standalone}" .`, {
    stdio: "inherit",
  });
  const sizeMB = (fs.statSync(archivePath).size / 1024 / 1024).toFixed(1);
  console.log(`Created deploy.tar.gz (${sizeMB} MB)`);
} catch (err) {
  console.error("Failed to create archive:", err.message);
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
