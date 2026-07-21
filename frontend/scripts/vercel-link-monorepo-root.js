/**
 * Vercel Git deploy (Next 16 + monorepo Root Directory=frontend) finalizes looking for
 * `/vercel/path0/.next` and `/vercel/path0/node_modules/next` at the repo root, while
 * the build writes under `frontend/`. Symlink both up one level on Vercel only.
 */
const fs = require("fs");
const path = require("path");

if (!process.env.VERCEL) {
  process.exit(0);
}

const frontendDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(frontendDir, "..");
const parentPkg = path.join(repoRoot, "package.json");

if (!fs.existsSync(parentPkg)) {
  console.log("vercel-link-monorepo-root: no monorepo parent package.json — skip");
  process.exit(0);
}

function linkToRoot(name) {
  const src = path.join(frontendDir, name);
  const dest = path.join(repoRoot, name);

  if (!fs.existsSync(src)) {
    console.error("vercel-link-monorepo-root: missing", src);
    process.exit(1);
  }

  fs.rmSync(dest, { recursive: true, force: true });
  fs.symlinkSync(src, dest, "junction");
  console.log("vercel-link-monorepo-root: linked", dest, "→", src);
}

linkToRoot(".next");
linkToRoot("node_modules");
