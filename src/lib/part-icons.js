const paths = {
  Aydınlatma: '<path d="M9 3h6l1 3-2 2v3H10V8L8 6l1-3Z"/><path d="M10 14h4M10.5 17h3"/>',
  Kaporta: '<path d="M4 13l1.5-5h9L16 13v5H4v-5Z"/><path d="M5.5 8h9M7 13h.01M13 13h.01"/>',
  Motor: '<path d="M4 9h3l2-2h4l2 2h2v6H4V9Z"/><path d="M7 12h6M9 7V5h3v2M17 11h2"/>',
  'Fren Sistemi': '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 5v3M19 12h-3M12 19v-3M5 12h3"/>',
  Süspansiyon: '<path d="M8 4v16M16 4v16M6 7h4M14 17h4M6 11h4M14 13h4"/>',
  Elektrik: '<path d="m13 2-7 11h5l-1 9 7-12h-5l1-8Z"/>',
  'İç Aksam': '<path d="M5 7h14v10H5z"/><path d="M8 7v4h8V7M8 17v-3M16 17v-3"/>',
  Şanzıman: '<path d="M7 4v6M17 4v6M7 10h10M12 10v5M9 19h6"/><circle cx="7" cy="4" r="2"/><circle cx="17" cy="4" r="2"/><circle cx="12" cy="17" r="2"/>',
  'Jant & Lastik': '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v5M20 12h-5M12 20v-5M4 12h5"/>',
  default: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>'
};

export function partIcon(name, label = name || 'Parça') {
  const safe = String(label).replace(/[&<>'"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  return '<svg class="part-svg" viewBox="0 0 24 24" role="img" aria-label="' + safe + '" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (paths[name] || paths.default) + '</svg>';
}