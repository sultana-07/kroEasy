// generate-sw.mjs
// Generates public/firebase-messaging-sw.js from the template by injecting env vars.
// Run automatically via `npm run prebuild` before every Vite build.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env file if present (local dev) — Vercel already injects env vars at build time
try {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach((line) => {
      const [key, ...rest] = line.split('=');
      if (key && key.startsWith('VITE_') && !process.env[key.trim()]) {
        process.env[key.trim()] = rest.join('=').trim();
      }
    });
  }
} catch {}

const templatePath = path.join(__dirname, '..', 'public', 'firebase-messaging-sw.template.js');
const outputPath  = path.join(__dirname, '..', 'public', 'firebase-messaging-sw.js');

let content = fs.readFileSync(templatePath, 'utf-8');

const vars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

vars.forEach((key) => {
  const value = process.env[key] || '';
  content = content.replaceAll(`{{${key}}}`, value);
});

fs.writeFileSync(outputPath, content, 'utf-8');
console.log('✅ firebase-messaging-sw.js generated from template');
