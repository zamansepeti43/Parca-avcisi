// Vehicle catalog for Parça Avcısı MVP (client-side; DB seed in migrations).
// Year ranges are inclusive. Records attribute to VehiclesDB (CC-BY 4.0) where applicable.

const years = (from, to) => {
  const out = [];
  for (let y = from; y <= to; y++) out.push(y);
  return out;
};

export const vehicleTypes = [
  'Otomobil', 'SUV / 4x4', 'Pickup / Kamyonet', 'Panelvan', 'Minibüs',
  'Kamyon', 'Otobüs', 'Motosiklet', 'Ticari Araç', 'Diğer',
];

export const vehicleCatalog = [
  // Tofaş — classic Turkish market
  { type: 'Otomobil', make: 'Tofaş', model: 'Şahin', generation: 'Şahin', years: years(1989, 1999), engines: ['1.4 L', '1.6 L'] },
  { type: 'Otomobil', make: 'Tofaş', model: 'Doğan', generation: 'Doğan', years: years(1989, 1999), engines: ['1.6 L'] },
  { type: 'Otomobil', make: 'Tofaş', model: 'Kartal', generation: 'Kartal', years: years(1986, 2002), engines: ['1.6 L'] },
  { type: 'Otomobil', make: 'Tofaş', model: 'Serçe', generation: 'Serçe', years: years(1977, 1985), engines: ['1.1 L', '1.3 L'] },
  { type: 'Otomobil', make: 'Tofaş', model: 'Murat 124', generation: 'Murat 124', years: years(1971, 1977), engines: ['1.2 L', '1.3 L'] },
  { type: 'Otomobil', make: 'Tofaş', model: 'Murat 131', generation: 'Murat 131', years: years(1974, 1984), engines: ['1.3 L', '1.6 L'] },
  { type: 'Otomobil', make: 'Tofaş', model: 'Murat 132', generation: 'Murat 132', years: years(1977, 1985), engines: ['1.3 L', '1.6 L'] },
  // Ford
  { type: 'Otomobil', make: 'Ford', model: 'Taunus', generation: 'Taunus', years: years(1969, 1985), engines: ['1.3 L', '1.6 L', '2.0 L'] },
  { type: 'Otomobil', make: 'Ford', model: 'Escort', generation: 'Escort', years: years(1981, 2000), engines: ['1.3 L', '1.6 L', '1.8 L', '1.8 D'] },
  { type: 'Otomobil', make: 'Ford', model: 'Fiesta', generation: 'Fiesta', years: years(1976, 2023), engines: ['1.25 L', '1.4 L', '1.6 L', '1.5 TDCi'] },
  { type: 'Otomobil', make: 'Ford', model: 'Focus', generation: 'Focus', years: years(1998, 2023), engines: ['1.6 L', '1.5 TDCi', '2.0 L'] },
  { type: 'Otomobil', make: 'Ford', model: 'Mondeo', generation: 'Mondeo', years: years(1993, 2019), engines: ['1.8 L', '2.0 L', '2.0 TDCi'] },
  { type: 'Panelvan', make: 'Ford', model: 'Transit', generation: 'Transit', years: years(1978, 2024), engines: ['2.0 D', '2.2 TDCi', '2.5 D'] },
  { type: 'Panelvan', make: 'Ford', model: 'Transit Connect', generation: 'Transit Connect', years: years(2002, 2023), engines: ['1.8 TDCi', '1.5 TDCi', '2.0 D'] },
  { type: 'Panelvan', make: 'Ford', model: 'Courier', generation: 'Courier', years: years(2018, 2024), engines: ['1.5 TDCi', '1.0 EcoBoost'] },
  // Renault
  { type: 'Otomobil', make: 'Renault', model: 'R5', generation: 'R5', years: years(1972, 1985), engines: ['0.8 L', '1.1 L', '1.4 L'] },
  { type: 'Otomobil', make: 'Renault', model: 'R9', generation: 'R9', years: years(1981, 1988), engines: ['1.1 L', '1.4 L'] },
  { type: 'Otomobil', make: 'Renault', model: 'R11', generation: 'R11', years: years(1983, 1988), engines: ['1.1 L', '1.4 L'] },
  { type: 'Otomobil', make: 'Renault', model: 'R12', generation: 'R12', years: years(1969, 1990), engines: ['1.3 L', '1.4 L', '1.6 L'] },
  { type: 'Otomobil', make: 'Renault', model: 'R19', generation: 'R19', years: years(1988, 2000), engines: ['1.4 L', '1.7 L', '1.9 D'] },
  { type: 'Otomobil', make: 'Renault', model: 'Clio', generation: 'Clio', years: years(1990, 2019), engines: ['1.2 L', '1.4 L', '1.5 dCi', '1.6 L'] },
  { type: 'Otomobil', make: 'Renault', model: 'Symbol', generation: 'Symbol', years: years(1999, 2012), engines: ['1.4 L', '1.5 dCi', '1.6 L'] },
  { type: 'Otomobil', make: 'Renault', model: 'Megane', generation: 'Megane', years: years(1995, 2024), engines: ['1.4 L', '1.6 L', '1.5 dCi', '1.4 TCe'] },
  { type: 'Otomobil', make: 'Renault', model: 'Laguna', generation: 'Laguna', years: years(1993, 2012), engines: ['1.8 L', '2.0 L', '1.9 dCi', '2.0 dCi'] },
  { type: 'Otomobil', make: 'Renault', model: 'Fluence', generation: 'Fluence', years: years(2010, 2019), engines: ['1.6 L', '1.5 dCi', '1.6 TCe'] },
  { type: 'Panelvan', make: 'Renault', model: 'Kangoo', generation: 'Kangoo', years: years(1997, 2021), engines: ['1.4 L', '1.5 dCi', '1.6 L'] },
  { type: 'Ticari Araç', make: 'Renault', model: 'Master', generation: 'Master', years: years(1980, 2024), engines: ['2.2 dCi', '2.3 dCi', '2.5 dCi'] },
  // Fiat
  { type: 'Otomobil', make: 'Fiat', model: '124', generation: '124', years: years(1966, 1974), engines: ['1.2 L', '1.4 L', '1.6 L'] },
  { type: 'Otomobil', make: 'Fiat', model: 'Uno', generation: 'Uno', years: years(1983, 2003), engines: ['1.0 L', '1.1 L', '1.4 L', '1.7 D'] },
  { type: 'Otomobil', make: 'Fiat', model: 'Tipo', generation: 'Tipo', years: years(1988, 2024), engines: ['1.4 L', '1.6 L', '1.3 Multijet'] },
  { type: 'Otomobil', make: 'Fiat', model: 'Tempra', generation: 'Tempra', years: years(1990, 1996), engines: ['1.4 L', '1.6 L', '1.9 D'] },
  { type: 'Otomobil', make: 'Fiat', model: 'Palio', generation: 'Palio', years: years(1996, 2008), engines: ['1.0 L', '1.2 L', '1.4 L'] },
  { type: 'Otomobil', make: 'Fiat', model: 'Siena', generation: 'Siena', years: years(1996, 2012), engines: ['1.0 L', '1.4 L', '1.3 Multijet'] },
  { type: 'Otomobil', make: 'Fiat', model: 'Marea', generation: 'Marea', years: years(1996, 2007), engines: ['1.4 L', '1.6 L', '1.9 JTD'] },
  { type: 'Otomobil', make: 'Fiat', model: 'Albea', generation: 'Albea', years: years(2002, 2014), engines: ['1.4 L', '1.3 Multijet'] },
  { type: 'Otomobil', make: 'Fiat', model: 'Punto', generation: 'Punto', years: years(1993, 2018), engines: ['1.2 L', '1.4 L', '1.3 Multijet'] },
  { type: 'Otomobil', make: 'Fiat', model: 'Linea', generation: 'Linea', years: years(2007, 2018), engines: ['1.4 L', '1.3 Multijet', '1.6 Multijet'] },
  { type: 'Otomobil', make: 'Fiat', model: 'Egea', generation: 'Egea', years: years(2015, 2024), engines: ['1.4 Fire', '1.3 Multijet', '1.6 E-Torq'] },
  { type: 'Panelvan', make: 'Fiat', model: 'Doblo', generation: 'Doblo', years: years(2000, 2022), engines: ['1.3 Multijet', '1.6 Multijet', '1.4 L'] },
  { type: 'Ticari Araç', make: 'Fiat', model: 'Fiorino', generation: 'Fiorino', years: years(1988, 2024), engines: ['1.0 L', '1.3 Multijet', '1.4 L'] },
  // Volkswagen
  { type: 'Otomobil', make: 'Volkswagen', model: 'Golf', generation: 'Golf', years: years(1974, 2024), engines: ['1.4 TSI', '1.6 TDI', '2.0 GTI', '1.6 L'] },
  { type: 'Otomobil', make: 'Volkswagen', model: 'Polo', generation: 'Polo', years: years(1975, 2023), engines: ['1.2 L', '1.4 L', '1.6 TDI'] },
  { type: 'Otomobil', make: 'Volkswagen', model: 'Passat', generation: 'Passat', years: years(1973, 2023), engines: ['1.4 TSI', '2.0 TDI', '1.8 L'] },
  { type: 'Otomobil', make: 'Volkswagen', model: 'Bora', generation: 'Bora', years: years(1998, 2005), engines: ['1.6 L', '1.8 T', '1.9 TDI'] },
  { type: 'Otomobil', make: 'Volkswagen', model: 'Jetta', generation: 'Jetta', years: years(1979, 2023), engines: ['1.6 L', '1.4 TSI', '2.0 TDI'] },
  { type: 'Otomobil', make: 'Volkswagen', model: 'Vento', generation: 'Vento', years: years(1992, 1998), engines: ['1.6 L', '1.8 L', '1.9 TDI'] },
  { type: 'Panelvan', make: 'Volkswagen', model: 'Transporter', generation: 'Transporter', years: years(1967, 2024), engines: ['1.6 D', '2.0 TDI', '2.5 TDI'] },
  { type: 'Panelvan', make: 'Volkswagen', model: 'Caddy', generation: 'Caddy', years: years(1982, 2024), engines: ['1.6 L', '1.9 TDI', '2.0 TDI'] },
  // Opel
  { type: 'Otomobil', make: 'Opel', model: 'Corsa', generation: 'Corsa', years: years(1982, 2023), engines: ['1.2 L', '1.4 L', '1.3 CDTi'] },
  { type: 'Otomobil', make: 'Opel', model: 'Astra', generation: 'Astra', years: years(1991, 2023), engines: ['1.4 L', '1.6 L', '1.7 CDTi'] },
  { type: 'Otomobil', make: 'Opel', model: 'Vectra', generation: 'Vectra', years: years(1988, 2008), engines: ['1.6 L', '1.8 L', '2.0 TDI'] },
  { type: 'Otomobil', make: 'Opel', model: 'Omega', generation: 'Omega', years: years(1986, 2003), engines: ['2.0 L', '2.2 L', '2.5 D'] },
  { type: 'Otomobil', make: 'Opel', model: 'Zafira', generation: 'Zafira', years: years(1999, 2014), engines: ['1.6 L', '1.8 L', '2.0 CDTi'] },
  { type: 'Panelvan', make: 'Opel', model: 'Combo', generation: 'Combo', years: years(1993, 2022), engines: ['1.3 CDTi', '1.6 L', '1.7 D'] },
  // Peugeot
  { type: 'Otomobil', make: 'Peugeot', model: '106', generation: '106', years: years(1991, 2003), engines: ['1.0 L', '1.1 L', '1.4 L'] },
  { type: 'Otomobil', make: 'Peugeot', model: '205', generation: '205', years: years(1983, 1998), engines: ['1.0 L', '1.1 L', '1.6 L'] },
  { type: 'Otomobil', make: 'Peugeot', model: '206', generation: '206', years: years(1998, 2009), engines: ['1.1 L', '1.4 L', '1.6 L', '1.4 HDi'] },
  { type: 'Otomobil', make: 'Peugeot', model: '306', generation: '306', years: years(1993, 2002), engines: ['1.4 L', '1.6 L', '1.9 D'] },
  { type: 'Otomobil', make: 'Peugeot', model: '307', generation: '307', years: years(2001, 2008), engines: ['1.4 L', '1.6 L', '2.0 HDi'] },
  { type: 'Otomobil', make: 'Peugeot', model: '308', generation: '308', years: years(2007, 2024), engines: ['1.2 PureTech', '1.6 HDi', '1.6 L'] },
  { type: 'Otomobil', make: 'Peugeot', model: '405', generation: '405', years: years(1987, 2005), engines: ['1.6 L', '1.9 L', '1.9 D'] },
  { type: 'Otomobil', make: 'Peugeot', model: '406', generation: '406', years: years(1995, 2004), engines: ['1.8 L', '2.0 L', '2.1 D'] },
  { type: 'Otomobil', make: 'Peugeot', model: '407', generation: '407', years: years(2004, 2011), engines: ['1.8 L', '2.0 L', '2.0 HDi'] },
  { type: 'Panelvan', make: 'Peugeot', model: 'Partner', generation: 'Partner', years: years(1996, 2018), engines: ['1.4 L', '1.6 HDi', '2.0 HDi'] },
  // Citroën
  { type: 'Otomobil', make: 'Citroën', model: 'Saxo', generation: 'Saxo', years: years(1996, 2003), engines: ['1.0 L', '1.1 L', '1.6 VTS'] },
  { type: 'Otomobil', make: 'Citroën', model: 'Xsara', generation: 'Xsara', years: years(1997, 2005), engines: ['1.4 L', '1.6 L', '2.0 HDi'] },
  { type: 'Otomobil', make: 'Citroën', model: 'C3', generation: 'C3', years: years(2002, 2024), engines: ['1.4 L', '1.6 HDi', '1.2 PureTech'] },
  { type: 'Otomobil', make: 'Citroën', model: 'C4', generation: 'C4', years: years(2004, 2024), engines: ['1.6 L', '1.6 HDi', '1.2 PureTech'] },
  { type: 'Otomobil', make: 'Citroën', model: 'C5', generation: 'C5', years: years(2001, 2021), engines: ['1.6 HDi', '2.0 L', '2.0 HDi'] },
  { type: 'Panelvan', make: 'Citroën', model: 'Berlingo', generation: 'Berlingo', years: years(1996, 2021), engines: ['1.4 L', '1.6 HDi', '1.5 BlueHDi'] },
  // Toyota
  { type: 'Otomobil', make: 'Toyota', model: 'Corolla', generation: 'Corolla', years: years(1979, 2023), engines: ['1.6 L', '1.8 L', '1.4 D-4D'] },
  { type: 'Otomobil', make: 'Toyota', model: 'Carina', generation: 'Carina', years: years(1979, 1998), engines: ['1.6 L', '1.8 L', '2.0 D'] },
  { type: 'Otomobil', make: 'Toyota', model: 'Yaris', generation: 'Yaris', years: years(1999, 2023), engines: ['1.0 L', '1.3 L', '1.5 Hybrid'] },
  { type: 'Otomobil', make: 'Toyota', model: 'Auris', generation: 'Auris', years: years(2006, 2019), engines: ['1.4 L', '1.6 L', '1.4 D-4D'] },
  { type: 'Otomobil', make: 'Toyota', model: 'Avensis', generation: 'Avensis', years: years(1997, 2018), engines: ['1.6 L', '1.8 L', '2.0 D-4D'] },
  { type: 'Otomobil', make: 'Toyota', model: 'Camry', generation: 'Camry', years: years(1985, 2024), engines: ['2.0 L', '2.5 L', '3.0 V6'] },
  { type: 'Pickup / Kamyonet', make: 'Toyota', model: 'Hilux', generation: 'Hilux', years: years(1968, 2024), engines: ['2.0 L', '2.4 D', '2.4 D-4D'] },
  // Extra makes for breadth
  { type: 'Otomobil', make: 'BMW', model: '3 Serisi', generation: '3 Serisi', years: years(1975, 2024), engines: ['1.6 L', '2.0 L', '2.0d', '3.0 L'] },
  { type: 'Otomobil', make: 'BMW', model: '5 Serisi', generation: '5 Serisi', years: years(1972, 2024), engines: ['2.0 L', '2.5 L', '3.0 L', '2.0d'] },
  { type: 'Otomobil', make: 'Audi', model: 'A3', generation: 'A3', years: years(1996, 2024), engines: ['1.6 L', '1.4 TFSI', '2.0 TDI'] },
  { type: 'Otomobil', make: 'Audi', model: 'A4', generation: 'A4', years: years(1994, 2024), engines: ['1.8 L', '2.0 TFSI', '2.0 TDI'] },
  { type: 'Otomobil', make: 'Audi', model: 'A6', generation: 'A6', years: years(1994, 2024), engines: ['2.0 TFSI', '2.4 V6', '2.5 TDI'] },
  { type: 'Otomobil', make: 'Mercedes-Benz', model: 'C Serisi', generation: 'C Serisi', years: years(1993, 2024), engines: ['1.8 L', '2.0 L', 'C 200 CDI'] },
  { type: 'Otomobil', make: 'Mercedes-Benz', model: 'E Serisi', generation: 'E Serisi', years: years(1984, 2024), engines: ['2.0 L', '2.2 CDI', '3.0 L'] },
  { type: 'Otomobil', make: 'Honda', model: 'Civic', generation: 'Civic', years: years(1972, 2024), engines: ['1.4 L', '1.6 L', '1.8 L'] },
  { type: 'Otomobil', make: 'Honda', model: 'Accord', generation: 'Accord', years: years(1976, 2024), engines: ['1.8 L', '2.0 L', '2.4 L'] },
  { type: 'Otomobil', make: 'Hyundai', model: 'Accent', generation: 'Accent', years: years(1994, 2018), engines: ['1.3 L', '1.4 L', '1.5 L'] },
  { type: 'Otomobil', make: 'Hyundai', model: 'Elantra', generation: 'Elantra', years: years(1990, 2024), engines: ['1.6 L', '1.8 L', '2.0 L'] },
  { type: 'Otomobil', make: 'Hyundai', model: 'i20', generation: 'i20', years: years(2008, 2024), engines: ['1.2 L', '1.4 L', '1.0 T-GDi'] },
  { type: 'Otomobil', make: 'Kia', model: 'Rio', generation: 'Rio', years: years(2000, 2024), engines: ['1.1 L', '1.25 L', '1.4 L'] },
  { type: 'Otomobil', make: 'Kia', model: 'Cerato', generation: 'Cerato', years: years(2003, 2024), engines: ['1.4 L', '1.6 L', '2.0 L'] },
  { type: 'Otomobil', make: 'Škoda', model: 'Fabia', generation: 'Fabia', years: years(1999, 2024), engines: ['1.2 L', '1.4 L', '1.2 TSI'] },
  { type: 'Otomobil', make: 'Škoda', model: 'Octavia', generation: 'Octavia', years: years(1996, 2024), engines: ['1.4 TSI', '1.6 L', '1.9 TDI'] },
  { type: 'Otomobil', make: 'Nissan', model: 'Micra', generation: 'Micra', years: years(1982, 2019), engines: ['1.0 L', '1.2 L', '1.3 L'] },
  { type: 'Otomobil', make: 'Nissan', model: 'Almera', generation: 'Almera', years: years(1995, 2007), engines: ['1.4 L', '1.5 L', '1.8 L'] },
  { type: 'SUV / 4x4', make: 'Nissan', model: 'Qashqai', generation: 'Qashqai', years: years(2006, 2024), engines: ['1.6 L', '1.5 dCi', '1.3 TCe'] },
  { type: 'Otomobil', make: 'Suzuki', model: 'Swift', generation: 'Swift', years: years(1983, 2024), engines: ['1.0 L', '1.2 L', '1.3 L'] },
  { type: 'SUV / 4x4', make: 'Suzuki', model: 'Vitara', generation: 'Vitara', years: years(1988, 2024), engines: ['1.4 BoosterJet', '1.6 L', '1.9 D'] },
  { type: 'SUV / 4x4', make: 'Toyota', model: 'RAV4', generation: 'RAV4', years: years(1994, 2024), engines: ['2.0 L', '2.2 D-4D', '2.5 Hybrid'] },
];

export function getMakes() {
  return [...new Set(vehicleCatalog.map(({ make }) => make))].sort((a, b) => a.localeCompare(b, 'tr'));
}

export function getModels(make) {
  return [...new Set(vehicleCatalog.filter((item) => !make || item.make === make).map(({ model }) => model))];
}

export function getYears(make, model) {
  return [...new Set(vehicleCatalog
    .filter((item) => (!make || item.make === make) && (!model || item.model === model))
    .flatMap(({ years: ys }) => ys))]
    .sort((a, b) => b - a);
}

export function optionsFor(selection, field) {
  if (field === 'type') return vehicleTypes;
  const rows = vehicleCatalog.filter((item) =>
    (!selection.type || item.type === selection.type) &&
    (!selection.make || item.make === selection.make) &&
    (!selection.model || item.model === selection.model) &&
    (!selection.generation || item.generation === selection.generation) &&
    (!selection.year || (item.years || []).includes(Number(selection.year)))
  );
  if (field === 'make') return [...new Set(rows.map(({ make }) => make))];
  if (field === 'model') return [...new Set(rows.map(({ model }) => model))];
  if (field === 'generation') return [...new Set(rows.map(({ generation }) => generation))];
  if (field === 'year') return [...new Set(rows.flatMap(({ years: ys }) => ys))].sort((a, b) => b - a);
  if (field === 'engine') return [...new Set(rows.flatMap(({ engines }) => engines))];
  return [];
}
