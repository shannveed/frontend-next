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

if (!sw.includes('__MF_BUILD_ID__')) {
  console.warn(
    '[sw] Placeholder "__MF_BUILD_ID__" not found. No changes applied.'
  );
  process.exit(0);
}

sw = sw.replace(/__MF_BUILD_ID__/g, version);

fs.writeFileSync(swPath, sw);
console.log(`[sw] Injected build id into service-worker.js: ${version}`);
