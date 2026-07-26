// frontend-next/scripts/write-indexnow-key-file.js
const fs = require('fs');
const path = require('path');
const { loadEnvConfig } = require('@next/env');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');

/**
 * Standalone Node scripts run before `next build`, so Next.js has not loaded
 * .env.local/.env.production yet. Load them explicitly using Next's official
 * environment loader.
 *
 * During `npm run build`, production-style env ordering is used. .env.local is
 * included by @next/env unless NODE_ENV is "test".
 */
loadEnvConfig(
  ROOT,
  process.env.NODE_ENV === 'development'
);

const key = String(
  process.env.INDEXNOW_KEY || ''
).trim();

const vercelEnv = String(
  process.env.VERCEL_ENV || ''
)
  .trim()
  .toLowerCase();

const nodeEnv = String(
  process.env.NODE_ENV || ''
)
  .trim()
  .toLowerCase();

const isProd =
  vercelEnv === 'production' ||
  nodeEnv === 'production';

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!key) {
  const message =
    '[indexnow] INDEXNOW_KEY is not set. Key files will not be generated.';

  if (isProd) {
    fail(message);
  }

  console.warn(message);
  process.exit(0);
}

if (!/^[a-zA-Z0-9_-]{8,128}$/.test(key)) {
  const message =
    '[indexnow] INDEXNOW_KEY must be URL/filename-safe. Recommended: generate a random hexadecimal key.';

  if (isProd) {
    fail(message);
  }

  console.warn(message);
  process.exit(0);
}

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, {
    recursive: true,
  });
}

const content = `${key}\n`;

/**
 * Generate:
 *
 * 1. /<INDEXNOW_KEY>.txt
 * 2. /indexnow-key.txt
 */
const filesToWrite = [
  `${key}.txt`,
  'indexnow-key.txt',
];

for (const fileName of filesToWrite) {
  const filePath = path.join(
    PUBLIC_DIR,
    fileName
  );

  const existing = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, 'utf8')
    : '';

  if (existing === content) {
    console.log(
      `[indexnow] Key file already up-to-date: public/${fileName}`
    );

    continue;
  }

  fs.writeFileSync(
    filePath,
    content,
    'utf8'
  );

  console.log(
    `[indexnow] Wrote key file: public/${fileName}`
  );
}
