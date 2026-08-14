import { readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
let checked = 0;
let failed = 0;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(js|mjs)$/.test(entry)) continue;
    checked++;
    try {
      execFileSync(process.execPath, ['--check', full], { stdio: 'pipe' });
    } catch (error) {
      failed++;
      console.error('LINT FAIL: ' + path.relative(srcDir, full));
      console.error(String(error.stderr || error.message));
    }
  }
}

walk(srcDir);
if (failed) {
  console.error(`\n${failed} dosya sözdizimi kontrolünden geçemedi (${checked} kontrol edildi).`);
  process.exit(1);
}
console.log(`Lint OK — ${checked} JavaScript dosyası sözdizimi kontrolünden geçti.`);
