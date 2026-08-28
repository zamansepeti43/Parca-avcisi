import { spawnSync } from 'node:child_process';
const r=spawnSync('python3',['scripts/catalog-adapters/catalog_source_runner.py'],{stdio:'inherit',env:{...process.env,CATALOG_SOURCE:'teknorot'}});
process.exit(r.status ?? 1);
