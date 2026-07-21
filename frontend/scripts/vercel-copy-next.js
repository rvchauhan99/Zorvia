/**
 * Vercel Git deploy (Next 16 + monorepo Root Directory=frontend) finalizes looking for
 * `/vercel/path0/.next/*` at the repo root, while the build writes `frontend/.next`.
 * Copy the output up one level on Vercel only so packaging succeeds.
 */
const fs = require("fs");
const path = require("path");

if (!process.env.VERCEL) {
  process.exit(0);
}

const src = path.resolve(__dirname, "..", ".next");
const parentPkg = path.resolve(__dirname, "..", "..", "package.json");
const dest = path.resolve(__dirname, "..", "..", ".next");

if (!fs.existsSync(src)) {
  console.error("vercel-copy-next: missing", src);
  process.exit(1);
}
if (!fs.existsSync(parentPkg)) {
  console.log("vercel-copy-next: no monorepo parent package.json — skip");
  process.exit(0);
}

const marker = path.join(src, "package.json");
if (!fs.existsSync(marker)) {
  console.error("vercel-copy-next: missing", marker);
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log("vercel-copy-next: copied .next →", dest);
