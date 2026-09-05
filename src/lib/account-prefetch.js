/* Preload account data that is expensive enough to make a route feel slow.
   Araçlarım is a frequently revisited account tab. Warm its module + saved-vehicle
   cache while the current account page is visible, so opening it does not wait on
   Supabase/module initialization. */
const ACCOUNT_ROUTES = new Set([
  '/profilim','/ilanlarim','/araclarim','/taleplerim','/mesajlarim','/favorilerim',
  '/kayitli-aramalarim','/bildirimler','/musterilerim','/hesap-bilgileri','/ayarlar','/yardim-destek'
]);
const path = (window.location.pathname.replace(/\/+$/, '') || '/');

if (ACCOUNT_ROUTES.has(path)) {
  Promise.all([
    import('./auth.js'),
    import('./saved-vehicles.js'),
    import('./turkey-vehicle-catalog-fix.js'),
    import('./saved-vehicles-ui.js'),
  ]).then(async ([auth, saved]) => {
    const user = await auth.getCurrentUser().catch(() => null);
    if (user) await saved.getSavedVehicles().catch(() => []);
  }).catch(() => {});
}
