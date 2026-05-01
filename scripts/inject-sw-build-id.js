// frontend-next/scripts/inject-sw-build-id.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const swPath = path.join(ROOT, 'public', 'service-worker.js');

if (!fs.existsSync(swPath)) {
  console.error('[sw] public/service-worker.js not found:', swPath);
  process.exit(1);
}

const rawVersion =
  process.env.VERCEL_DEPLOYMENT_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  '';

const version = String(rawVersion || `dev-${Date.now()}`)
  .trim()
  .replace(/[^a-zA-Z0-9._-]/g, '')
  .slice(0, 64);

let sw = fs.readFileSync(swPath, 'utf8');

if (sw.includes('__MF_BUILD_ID__')) {
  sw = sw.replace(/__MF_BUILD_ID__/g, version);
  fs.writeFileSync(swPath, sw);
  console.log(`[sw] Injected build id into service-worker.js: ${version}`);
  process.exit(0);
}

/**
 * If placeholder was already replaced in a previous commit/build,
 * update the CACHE_VERSION assignment directly.
 */
const cacheVersionRegex =
  /const\s+CACHE_VERSION\s*=\s*['"`][^'"`]*['"`]\s*;/;

if (cacheVersionRegex.test(sw)) {
  sw = sw.replace(cacheVersionRegex, `const CACHE_VERSION = '${version}';`);
  fs.writeFileSync(swPath, sw);
  console.log(`[sw] Updated CACHE_VERSION in service-worker.js: ${version}`);
  process.exit(0);
}

console.warn('[sw] CACHE_VERSION declaration not found. No changes applied.');
