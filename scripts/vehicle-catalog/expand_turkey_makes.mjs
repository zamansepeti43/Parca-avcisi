import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const jsonPath = path.join(root, 'data/vehicle-catalog-merged.json');
const jsPath = path.join(root, 'src/lib/vehicle-catalog.js');
const makesPath = path.join(root, 'data/vehicle-catalog-sources/turkey-makes.json');
const VDB = 'https://cdn.jsdelivr.net/gh/vehiclesdb/vehiclesdb@latest/dist/vehicles.json';
const clean = v => String(v ?? '').replace(/\s+/g,' ').trim();
const k = (...v) => v.map(clean).join('|').toLocaleLowerCase('tr-TR');
const yearsFor = x => { const a=[]; const f=Number(x.year_start ?? x.year_from ?? x.years?.[0]); const t=Number(x.year_end ?? x.year_to ?? x.years?.at(-1) ?? f); if(Number.isFinite(f)) for(let y=f;y<=t;y++) a.push(y); return a; };
const get = async u => { const r=await fetch(u,{headers:{'User-Agent':'Parca-Avcisi-Turkey-Make-Expander/1.0'}}); if(!r.ok) throw new Error(`${r.status} ${u}`); return r.json(); };
function flatten(d){const out=[]; if(Array.isArray(d)){for(const x of d){if(x?.make&&x?.name)out.push(x); if(x?.name&&Array.isArray(x.models))for(const m of x.models)out.push({make:x.name,...m});}} else if(d?.makes){for(const m of d.makes||[])for(const x of m.models||[])out.push({make:m.name,...x});} else for(const [make,v] of Object.entries(d||{})){for(const x of Array.isArray(v)?v:(v?.models||[]))if(x?.name)out.push({make,...x});} return out;}
const payload=JSON.parse(await fs.readFile(jsonPath,'utf8'));
const cfg=JSON.parse(await fs.readFile(makesPath,'utf8'));
const allowed=new Set(cfg.makes.map(x=>clean(x).toLocaleLowerCase('tr-TR')));
const records=payload.records||[]; const seen=new Set(records.map(x=>k(x.make,x.model,x.generation,x.body,x.year_from,x.year_to)));
const vdb=await get(VDB);
for(const r of flatten(vdb)){
  const make=clean(r.make||r.make_name); if(!allowed.has(make.toLocaleLowerCase('tr-TR'))) continue;
  const item={type:r.kind==='van'?'Panelvan':r.kind==='truck'?'Kamyon':r.kind==='bus'?'Otobüs':r.kind==='motorcycle'?'Motosiklet':'Otomobil',make,model:clean(r.name),generation:clean(r.generation?.name)||undefined,body:Array.isArray(r.body_types)?r.body_types[0]:r.body_type,years:Array.isArray(r.years)?r.years:yearsFor(r),year_from:r.year_start??r.year_from,year_to:r.year_end??r.year_to,engines:[],fuels:[],transmissions:[],trims:[],engineDetails:[],provenance:['VehiclesDB','TSB-make-scope']};
  if(!item.model) continue; const id=k(item.make,item.model,item.generation,item.body,item.year_from,item.year_to); if(!seen.has(id)){seen.add(id);records.push(item);}
}
records.sort((a,b)=>k(a.make,a.model,a.generation,a.body).localeCompare(k(b.make,b.model,b.generation,b.body),'tr'));
payload.version=new Date().toISOString().slice(0,10); payload.scope='TR-first vehicle catalog'; payload.sources=[...(payload.sources||[]).filter(x=>x.id!=='TSB-make-scope'),{id:'TSB-make-scope',url:cfg.source_url,brand_count:cfg.makes.length}]; payload.counts={records:records.length,makes:new Set(records.map(x=>x.make)).size,models:new Set(records.map(x=>k(x.make,x.model))).size}; payload.records=records;
await fs.writeFile(jsonPath,JSON.stringify(payload,null,2)+'\n');
const js=`// GENERATED FILE — do not edit manually.\n// Sources: Parça Avcısı legacy + InformationCar + VehiclesDB + TSB Turkey make scope.\n// VehiclesDB attribution: Vehicle data by VehiclesDB (https://vehiclesdb.com)\nexport const vehicleTypes=['Otomobil','SUV / 4x4','Pickup / Kamyonet','Panelvan','Minibüs','Kamyon','Otobüs','Motosiklet','Ticari Araç','Diğer'];\nexport const vehicleCatalog=${JSON.stringify(records,null,2)};\nexport function optionsFor(selection,field){const rows=vehicleCatalog;if(field==='type')return [...new Set(rows.map(x=>x.type).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));if(field==='make')return [...new Set(rows.filter(x=>!selection.type||x.type===selection.type).map(x=>x.make).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));if(field==='model')return [...new Set(rows.filter(x=>(!selection.type||x.type===selection.type)&&(!selection.make||x.make===selection.make)).map(x=>x.model).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));if(field==='year')return [...new Set(rows.filter(x=>(!selection.make||x.make===selection.make)&&(!selection.model||x.model===selection.model)).flatMap(x=>x.years?.length?x.years:yearsFor(x))).filter(Boolean)].sort((a,b)=>a-b).map(String);if(field==='engine')return [...new Set(rows.filter(x=>(!selection.make||x.make===selection.make)&&(!selection.model||x.model===selection.model)&&(!selection.year||!x.years?.length||x.years.includes(Number(selection.year))).flatMap(x=>[...(x.trims||[]),...(x.engines||[])])).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));return [];}\nfunction yearsFor(x){const a=[];const f=Number(x.year_from);const t=Number(x.year_to||f);if(Number.isFinite(f))for(let y=f;y<=t;y++)a.push(y);return a;}\n`;
await fs.writeFile(jsPath,js);
console.log(JSON.stringify(payload.counts));
