import fs from 'node:fs/promises';
const p='src/lib/vehicle-catalog.js';
let s=await fs.readFile(p,'utf8');
if(!s.includes('export function getMakes')) s += `\nexport function getMakes(selection={}) { return optionsFor(selection,'make'); }\nexport function getModels(selection={}) { return optionsFor(selection,'model'); }\nexport function getYears(selection={}) { return optionsFor(selection,'year'); }\n`;
await fs.writeFile(p,s);
