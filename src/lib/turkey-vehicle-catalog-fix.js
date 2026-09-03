import { VehicleResolver } from './vehicle-resolver.js';

const NON_PASSENGER_MAKES = new Set([
  'ADRIA','AKIA','ALKE','AR-BUS','ASTRA','AVIA','BOZANKAYA','BREDAMENARIBUS','CARTHAGO',
  'CRRC','DAF','EMT','ETRUSCO','FEST','FOTON','GAZ','GROVE','GULERYUZ','HABAS','HBS','HISCAR',
  'HOBBY','HYMER','ISOBUS','IRIZAR','KAMAZ','KARSAN','KENWORTH','KNAUS','KOMI','LAIKA',
  'MAN','MENARINIBUS','MILLER','MOTORSIKLET','MULTICAR','NEOPLAN','NIEVE','OTOKAR/MAGIRUS',
  'OTOYOL\\IVECO\\FIAT','PIMAKINA','SAME','SANY','SCANIA','SCHMIDT','SETRA','SINOTRUK','SITRAK',
  'SOLARIS','TADANO FAUN','TATRA','TCV','TEMSA','TENAX','TEZELLER','TURKAR','TURKKAR','VEICOLI',
  'WEINSBERG','WMA','ZIRAI TRAKTOR','ZOOMLION'
]);

const norm = (v) => String(v ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleUpperCase('tr-TR');
const unique = (values) => [...new Set((values || []).flatMap((v) => Array.isArray(v) ? v : [v]).filter(Boolean).map(String))]
  .sort((a, b) => a.localeCompare(b, 'tr', { numeric: true }));

const originalGetOptions = VehicleResolver.prototype.getOptions;
VehicleResolver.prototype.getOptions = function patchedGetOptions(selection = {}, field) {
  const options = Array.isArray(originalGetOptions.call(this, selection, field))
    ? originalGetOptions.call(this, selection, field)
    : Array.from(originalGetOptions.call(this, selection, field) || []);

  if (field === 'make' && (!selection.type || selection.type === 'Otomobil')) {
    return unique(options.filter((make) => !NON_PASSENGER_MAKES.has(norm(make))));
  }

  if (field === 'engine' && norm(selection.make) === 'FORD' && norm(selection.model) === 'ESCORT' && String(selection.year) === '1997') {
    return unique([
      ...options,
      '1.3 CLX HB', '1.3 CLX Sedan',
      '1.6 C HB', '1.6 C Sedan',
      '1.6 CLX HB', '1.6 CLX Sedan',
      '1.8 D HB', '1.8 D Sedan',
      '1.8 Zetec GL HB', '1.8 Zetec GL Sedan',
      '1.8 Zetec GLX HB', '1.8 Zetec GLX Sedan'
    ]);
  }

  return options;
};

window.__turkeyVehicleCatalogFix = { nonPassengerMakes: NON_PASSENGER_MAKES.size };
