// Gerçekçi enstrüman sesleri için GeneralUser GS (ücretsiz, serbest lisanslı) ses bankasını indirir.
// Kurulum dosyası hazırlanırken otomatik çalışır: node scripts/fetch-soundfont.mjs
import { mkdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'assets', 'soundfont');
const file = path.join(dir, 'GeneralUser-GS.sf2');
const URL = 'https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/main/GeneralUser-GS.sf2';

mkdirSync(dir, { recursive: true });
if (existsSync(file) && statSync(file).size > 20_000_000) {
  console.log('Ses bankası zaten var.');
  process.exit(0);
}
console.log('İndiriliyor:', URL);
const res = await fetch(URL);
if (!res.ok) {
  console.error('İndirilemedi:', res.status, res.statusText);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
if (buf.length < 20_000_000 || buf.toString('ascii', 0, 4) !== 'RIFF') {
  console.error('Beklenmeyen dosya içeriği, boyut:', buf.length);
  process.exit(1);
}
writeFileSync(file, buf);
console.log(`Tamam (${(buf.length / 1e6).toFixed(1)} MB)`);
