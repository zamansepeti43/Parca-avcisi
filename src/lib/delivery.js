export const DELIVERY_OPTIONS = [
  { value: 'kargo', label: 'Kargo ile gönderilir' },
  { value: 'ambar', label: 'Ambar / Nakliye' },
  { value: 'elden', label: 'Elden teslim' },
  { value: 'alici-alir', label: 'Alıcı gelip alabilir' },
  { value: 'satici-gonderir', label: 'Satıcı gönderir' },
];

export function deliveryLabel(key) {
  return (DELIVERY_OPTIONS.find((option) => option.value === key) || {}).label || '';
}
