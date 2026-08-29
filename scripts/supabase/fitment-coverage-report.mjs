import fs from 'node:fs/promises';
const url=process.env.SUPABASE_URL?.replace(/\/$/,''); const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key) throw new Error('Missing Supabase secrets');
const h={apikey:key,Authorization:`Bearer ${key}`};
async function get(path){const r=await fetch(`${url}/rest/v1/${path}`,{headers:h});if(!r.ok)throw new Error(`${r.status} ${await r.text()}`);return r.json()}
const parts=await get('parts?select=part_number,brand,oem_numbers&limit=100000');
const fits=await get('part_vehicle_fitments?select=part_id,vehicle_id&limit=1000000');
const by=new Set(fits.map(x=>x.part_id));
console.log(JSON.stringify({parts:parts.length,fitment_rows:fits.length,parts_with_fitment:by.size,parts_without_fitment:parts.length-by.size,coverage:parts.length?by.size/parts.length:0}));
