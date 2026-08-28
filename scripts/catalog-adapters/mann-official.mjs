import { load } from 'cheerio';

const BASE = 'https://www.mann-filter.com';

export function normalizePartNumber(value = '') {
  return String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function normalizeRecord(raw, sourceUrl) {
  const brand = 'MANN-FILTER';
  const partNumber = String(raw.partNumber || '').trim();
  if (!partNumber) return null;
  return {
    brand,
    part_number: partNumber,
    canonical_key: `${brand}:${normalizePartNumber(partNumber)}`,
    part_name: raw.partName || null,
    category: raw.category || null,
    oem_numbers: [...new Set((raw.oemNumbers || []).map(normalizePartNumber).filter(Boolean))],
    vehicle_applications: raw.vehicleApplications || [],
    technical: raw.technical || {},
    source_url: sourceUrl,
    source_quality: 0.99,
  };
}

export function parseProductPage(html, sourceUrl) {
  const $ = load(html);
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  const title = $('h1').first().text().trim();
  const partNumber = title.match(/\b[A-Z]{1,4}\s?\d{2,5}(?:[\/]\w+)?\b/i)?.[0] || '';
  if (!partNumber) return null;
  return normalizeRecord({ partNumber, partName: title, category: text.match(/(oil|air|fuel|cabin|hydraulic|coolant|transmission)/i)?.[1] || null }, sourceUrl);
}

export async function fetchProductPage(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'Parca-Avcisi-Catalog-Worker/1.0' } });
  if (!response.ok) throw new Error(`MANN catalog HTTP ${response.status}`);
  return parseProductPage(await response.text(), url);
}

export { BASE };
