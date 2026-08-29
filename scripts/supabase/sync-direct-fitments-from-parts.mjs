const BASE = process.env.SUPABASE_URL?.replace(/\/$/, '');
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE || !KEY) throw new Error('Missing Supabase secrets');
const H={apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'};
const PAGE=1000, FLUSH=500;
const norm=v=>String(v??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'');
const overlap=(a,b,c,d)=>(a??0)<=(d??9999)&&(c??0)<=(b??9999);
async function get(table,select,offset){
 const u=new URL(`${BASE}/rest/v1/${table}`);u.searchParams.set('select',select);u.searchParams.set('order','id.asc');u.searchParams.set('limit',PAGE);u.searchParams.set('offset',offset);
 const r=await fetch(u,{headers:H});if(!r.ok)throw new Error(`${table} ${r.status}: ${(await r.text()).slice(0,300)}`);return r.json();
}
async function post(rows){if(!rows.length)return;for(let i=0;i<rows.length;i+=FLUSH){const b=rows.slice(i,i+FLUSH);const r=await fetch(`${BASE}/rest/v1/part_vehicle_fitments?on_conflict=part_id,vehicle_id`,{method:'POST',headers:{...H,Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(b)});if(!r.ok)throw new Error(`fitment ${r.status}: ${(await r.text()).slice(0,300)}`);written+=b.length;}}
let written=0,parts=0,apps=0;
const vehicles=[];for(let o=0;;o+=PAGE){const rows=await get('vehicles','id,make,model,year_from,year_to,engine_code',o);vehicles.push(...rows);if(rows.length<PAGE)break;}
const makes=[...new Set(vehicles.map(v=>v.make).filter(Boolean))].sort((a,b)=>b.length-a.length);
let buffer=[];const seen=new Set();
for(let o=0;;o+=PAGE){
 const rows=await get('parts','id,applications,brand,part_number',o);if(!rows.length)break;
 for(const p of rows){parts++;const arr=Array.isArray(p.applications)?p.applications:[];for(const raw of arr){apps++;let a=raw&&typeof raw==='object'?raw:{raw:String(raw??'')};let make=String(a.make??'').trim();let model=String(a.model??a.model_type??'').trim();let text=String(a.raw??a.raw_text??'');
   if(!make){const hit=makes.find(m=>norm(text).includes(norm(m)));if(hit)make=hit;}
   if(!make)continue;const cand=vehicles.filter(v=>norm(v.make)===norm(make));if(!cand.length)continue;
   if(!model){let best=null;for(const v of cand){const m=norm(v.model);if(m.length>=3&&norm(text).includes(m)&&(!best||m.length>best.length))best=m;}if(best)model=cand.find(v=>norm(v.model)===best)?.model??'';}
   let matches=cand;if(model)matches=matches.filter(v=>norm(v.model)===norm(model));
   const yf=Number.parseInt(a.year_from,10);const yt=Number.parseInt(a.year_to,10);if(Number.isFinite(yf)||Number.isFinite(yt))matches=matches.filter(v=>overlap(v.year_from,v.year_to,Number.isFinite(yf)?yf:0,Number.isFinite(yt)?yt:9999));
   const eng=norm(a.engine_code);if(eng) {const exact=matches.filter(v=>norm(v.engine_code)===eng);if(exact.length)matches=exact;}
   for(const v of matches){const k=`${p.id}|${v.id}`;if(seen.has(k))continue;seen.add(k);buffer.push({part_id:p.id,vehicle_id:v.id,match_method:'catalog_direct',confidence:0.95,source_record_id:null});if(buffer.length>=FLUSH*2){await post(buffer);buffer=[];}}
 }}
 console.log(`DIRECT_PROGRESS parts=${parts} apps=${apps} written=${written}`);
 if(rows.length<PAGE)break;
}
await post(buffer);
console.log(JSON.stringify({FITMENT_SYNC_COMPLETE:true,mode:'parts_applications_direct',parts_processed:parts,applications_processed:apps,fitments_written:written}));
