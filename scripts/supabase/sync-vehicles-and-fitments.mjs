import fs from 'node:fs/promises';

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY GitHub secret.');
const auth = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
const raw = JSON.parse(await fs.readFile('data/vehicle-catalog-sync.json', 'utf8'));
const vehicles = Array.isArray(raw.vehicles) ? raw.vehicles : [];
if (!vehicles.length) throw new Error('vehicle-catalog-sync.json contains no vehicles.');

const retry=async(url,body,label)=>{let last='';for(let a=1;a<=5;a++){const r=await fetch(url,{method:'POST',headers:auth,body:JSON.stringify(body)});const t=await r.text();if(r.ok)return t;last=`${r.status} ${t}`;console.warn(`${label} attempt ${a}/5 failed: ${last}`);if(a<5)await new Promise(x=>setTimeout(x,a*15000));}throw new Error(`${label} failed after 5 attempts: ${last}`)};

const vehicleUrl=`${SUPABASE_URL}/functions/v1/sync-vehicle-catalog`;
for(let offset=0;offset<vehicles.length;offset+=500){const batch=vehicles.slice(offset,offset+500);console.log(`VEHICLE_SYNC offset=${offset} count=${batch.length} result=${await retry(vehicleUrl,{vehicles:batch},`Vehicle sync offset ${offset}`)}`)}
console.log(`VEHICLES_SOURCE_CATALOG=${vehicles.length}`);

// Direct catalog path: applications already declared by the catalog are authoritative.
// Register missing catalog-defined vehicle variants and write (part, vehicle) fitments
// without the expensive part x full vehicle-catalog Cartesian scan.
const rpcUrl=`${SUPABASE_URL}/rest/v1/rpc/sync_catalog_direct_fitments`;
const resultText=await retry(rpcUrl,{},'Direct catalog fitment sync');
let result;
try{result=JSON.parse(resultText)}catch{throw new Error(`Invalid direct fitment response: ${resultText}`)}
console.log(`CATALOG_DIRECT_FITMENT_SYNC=${JSON.stringify(result)}`);
console.log(JSON.stringify({FITMENT_SYNC_COMPLETE:true,mode:'catalog_direct',...result}));
