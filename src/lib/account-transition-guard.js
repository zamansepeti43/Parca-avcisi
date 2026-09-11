/*
 * Account transition guard is intentionally disabled.
 *
 * Account routes now have a single visible shell owned by main.js and a single
 * pane navigator owned by account-stable-navigation.js. The previous guard
 * cached rendered pane HTML in sessionStorage and repainted it during route
 * transitions. Older cached values could contain a complete .account-shell,
 * which then became a second nested account screen after the renderer changed.
 *
 * Keep this file as a compatibility entry point because older HTML pages still
 * reference it, but do not mutate the account DOM or sessionStorage here.
 */
window.__accountTransitionGuardDisabled = true;
