import { spawnSync } from 'node:child_process';
const r = spawnSync('python3', ['scripts/catalog-adapters/aypar_safe.py'], { stdio: 'inherit', env: { ...process.env, CATALOG_SOURCE: 'aypar' } });
process.exit(r.status ?? 1);
