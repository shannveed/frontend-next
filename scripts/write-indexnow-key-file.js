// frontend-next/scripts/write-indexnow-key-file.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

const key = String(process.env.INDEXNOW_KEY || '').trim();
const vercelEnv = String(process.env.VERCEL_ENV || '').toLowerCase();

const isProd =
  vercelEnv === 'production' || process.env.NODE_ENV === 'production';

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

if (!key) {
  const msg =
    '[indexnow] INDEXNOW_KEY is not set. Key file will NOT be generated.';

  if (isProd) fail(msg);

  console.warn(msg);
  process.exit(0);
}

if (!/^[a-zA-Z0-9_-]{8,128}$/.test(key)) {
  const msg =
    '[indexnow] INDEXNOW_KEY must be URL/filename-safe. Recommended: openssl rand -hex 16';

  if (isProd) fail(msg);

  console.warn(msg);
  process.exit(0);
}

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

const content = `${key}\n`;

/**
 * Write both:
 * 1) /<key>.txt          recommended by IndexNow
 * 2) /indexnow-key.txt   keeps your existing backend env style working
 */
const filesToWrite = [`${key}.txt`, 'indexnow-key.txt'];

for (const fileName of filesToWrite) {
  const filePath = path.join(PUBLIC_DIR, fileName);

  const existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf8')
    : '';

  if (existing === content) {
    console.log(`[indexnow] Key file already up-to-date: public/${fileName}`);
    continue;
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`[indexnow] Wrote key file: public/${fileName}`);
}
