const DEFAULT_FILTERS = Object.freeze({
  minPrice: '',
  maxPrice: '',
  city: '',
  sort: 'relevance',
});

const normalize = (value) => String(value ?? '').trim().toLocaleLowerCase('tr-TR');
const toNumber = (value) => {
  const number = Number(String(value ?? '').replace(/[^0-9,.-]/g, '').replace(',', '.'));
  return Number.isFinite(number) ? number : null;
};

export function createListingFilterState(initial = {}) {
  return { ...DEFAULT_FILTERS, ...initial };
}

export function applyListingFilters(items, filters = DEFAULT_FILTERS) {
  const min = toNumber(filters.minPrice);
  const max = toNumber(filters.maxPrice);
  const city = normalize(filters.city);

  const filtered = items.filter((item) => {
    const price = toNumber(item.price);
    if (min !== null && (price === null || price < min)) return false;
    if (max !== null && (price === null || price > max)) return false;
    if (city && normalize(item.city) !== city) return false;
    return true;
  });

  const sort = filters.sort || 'relevance';
  if (sort === 'price_asc') filtered.sort((a, b) => (toNumber(a.price) ?? Infinity) - (toNumber(b.price) ?? Infinity));
  if (sort === 'price_desc') filtered.sort((a, b) => (toNumber(b.price) ?? -Infinity) - (toNumber(a.price) ?? -Infinity));
  if (sort === 'newest') filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return filtered;
}

export { DEFAULT_FILTERS };
