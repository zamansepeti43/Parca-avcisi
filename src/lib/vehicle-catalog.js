// Small, normalized starter subset. Each record is attributable to VehiclesDB (CC-BY 4.0).
export const vehicleTypes = [
  'Otomobil', 'SUV / 4x4', 'Pickup / Kamyonet', 'Panelvan', 'Minibüs',
  'Kamyon', 'Otobüs', 'Motosiklet', 'Ticari Araç', 'Diğer',
];

export const vehicleCatalog = [
  { type: 'Otomobil', make: 'Volkswagen', model: 'Golf', generation: 'Golf VII', years: [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020], engines: [] },
  { type: 'Otomobil', make: 'Volkswagen', model: 'Passat', generation: 'B8', years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022], engines: [] },
  { type: 'Otomobil', make: 'BMW', model: '3 Serisi', generation: 'F30', years: [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019], engines: [] },
  { type: 'Otomobil', make: 'Audi', model: 'A4', generation: 'B8', years: [2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015], engines: [] },
  { type: 'Otomobil', make: 'Renault', model: 'Megane', generation: 'Megane III', years: [2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016], engines: [] },
  { type: 'Otomobil', make: 'Fiat', model: 'Egea', generation: 'Egea', years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], engines: [] },
  { type: 'Otomobil', make: 'Toyota', model: 'Corolla', generation: 'E210', years: [2019, 2020, 2021, 2022, 2023, 2024], engines: [] },
  { type: 'SUV / 4x4', make: 'Toyota', model: 'RAV4', generation: 'XA50', years: [2019, 2020, 2021, 2022, 2023, 2024], engines: [] },
  { type: 'Panelvan', make: 'Ford', model: 'Transit', generation: 'V363', years: [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024], engines: [] },
  { type: 'Motosiklet', make: 'Honda', model: 'CBR', generation: 'CBR', years: [], engines: [] },
];

export function optionsFor(selection, field) {
  const rows = vehicleCatalog.filter((item) =>
    (!selection.type || item.type === selection.type) &&
    (!selection.make || item.make === selection.make) &&
    (!selection.model || item.model === selection.model) &&
    (!selection.generation || item.generation === selection.generation)
  );
  if (field === 'make') return [...new Set(rows.map(({ make }) => make))];
  if (field === 'model') return [...new Set(rows.map(({ model }) => model))];
  if (field === 'generation') return [...new Set(rows.map(({ generation }) => generation))];
  if (field === 'year') return [...new Set(rows.flatMap(({ years }) => years))].sort((a, b) => b - a);
  if (field === 'engine') return [...new Set(rows.flatMap(({ engines }) => engines))];
  return [];
}
