import fs from 'node:fs/promises';

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY GitHub secret.');
const auth = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };
const raw = JSON.parse(await fs.readFile('data/vehicle-catalog-sync.json', 'utf8'));
const vehicles = Array.isArray(raw.vehicles) ? raw.vehicles : [];
if (!vehicles.length) throw new Error('vehicle-catalog-sync.json contains no vehicles.');
const norm=v=>String(v??'').toUpperCase().replace(/[^A-Z0-9]+/g,'').trim();
const retry=async(url,body,label)=>{let last='';for(let a=1;a<=5;a++){const r=await fetch(url,{method:'POST',headers:auth,body:JSON.stringify(body)});const t=await r.text();if(r.ok)return t;last=`${r.status} ${t}`;console.warn(`${label} attempt ${a}/5 failed: ${last}`);if(a<5)await new Promise(x=>setTimeout(x,a*15000));}throw new Error(`${label} failed after 5 attempts: ${last}`)};
const vehicleUrl=`${SUPABASE_URL}/functions/v1/sync-vehicle-catalog`;
for(let offset=0;offset<vehicles.length;offset+=500){const batch=vehicles.slice(offset,offset+500);console.log(`VEHICLE_SYNC offset=${offset} count=${batch.length} result=${await retry(vehicleUrl,{vehicles:batch},`Vehicle sync offset ${offset}`)}`)}
console.log(`VEHICLES_SOURCE_CATALOG=${vehicles.length}`);

// Fast path: let the server reuse previously solved fitments by canonical part number/OEM.
let afterId=null,batchNo=0,totalProcessed=0,totalMatched=0,totalUpserted=0,totalReused=0;
const functionUrl=`${SUPABASE_URL}/functions/v1/sync-part-fitments`;
while(true){const payload={limit:500,...(afterId?{after_id:afterId}:{})};const text=await retry(functionUrl,payload,`Fitment batch after ${afterId??'START'}`);let result;try{result=JSON.parse(text)}catch{throw new Error(`Invalid fitment response: ${text}`)}batchNo++;totalProcessed+=Number(result.processed)||0;totalMatched+=Number(result.matched)||0;totalUpserted+=Number(result.upserted)||0;totalReused+=Number(result.reused)||0;console.log(`FITMENT_BATCH=${batchNo} after_id=${afterId??'START'} result=${text}`);const nextId=result.last_id;if(!result.has_more||!nextId||nextId===afterId)break;afterId=nextId}
console.log(JSON.stringify({FITMENT_SYNC_COMPLETE:true,batches:batchNo,processed:totalProcessed,matched:totalMatched,upserted:totalUpserted,reused:totalReused}));
