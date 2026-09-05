const STORAGE_KEY = 'parca-avcisi-theme';
const DEFAULT_THEME = 'dark';

const themeCss = `
html[data-pa-theme="light"] body,
html[data-pa-theme="light"] #root{background:#f5f6f7!important;color:#171a1e!important}
html[data-pa-theme="dark"] body,
html[data-pa-theme="dark"] #root{background:#070a0e!important;color:#eef1f4!important}
html[data-pa-theme="light"] .site-header{background:rgba(255,255,255,.96)!important;border-bottom-color:#e1e4e7!important}
html[data-pa-theme="light"] .brand,html[data-pa-theme="light"] .brand strong{color:#171a1e!important}
html[data-pa-theme="light"] .desktop-nav a{color:#5f6872!important}
html[data-pa-theme="light"] .desktop-nav a:hover{color:#111!important}
html[data-pa-theme="light"] .outline-btn{background:#fff!important;color:#171a1e!important;border-color:#cfd4d9!important}
html[data-pa-theme="light"] .hero{background:radial-gradient(circle at 78% 20%,rgba(245,185,0,.16),transparent 30%),linear-gradient(135deg,#fff 0%,#f3f5f7 55%,#eef1f4 100%)!important;color:#171a1e!important}
html[data-pa-theme="light"] .hero p{color:#68717b!important}
html[data-pa-theme="light"] .hero .eyebrow{color:#a87500!important}
html[data-pa-theme="light"] .search-box{background:#fff!important;border-color:#cfd5db!important;box-shadow:0 16px 40px rgba(22,28,34,.10)!important}
html[data-pa-theme="light"] .search-box input{color:#171a1e!important}
html[data-pa-theme="light"] .search-box input::placeholder{color:#8a929b!important}
html[data-pa-theme="light"] .quick-tags button{background:#fff!important;border-color:#d7dce0!important;color:#5f6872!important}
html[data-pa-theme="light"] .hero-trust{color:#707983!important}
html[data-pa-theme="light"] .hero-trust span:first-child{color:#424a53!important}
html[data-pa-theme="light"] .marketplace-cta,html[data-pa-theme="light"] .vehicle-section,html[data-pa-theme="light"] .how{background:#f5f6f7!important}
html[data-pa-theme="light"] .marketplace-card,html[data-pa-theme="light"] .category-card,html[data-pa-theme="light"] .listing-card,html[data-pa-theme="light"] .steps article{background:#fff!important;color:#171a1e!important;border-color:#dfe3e7!important}
html[data-pa-theme="light"] .marketplace-card p,html[data-pa-theme="light"] .category-card small,html[data-pa-theme="light"] .listing-card p,html[data-pa-theme="light"] .steps p{color:#737c85!important}
html[data-pa-theme="light"] .vehicle-card{background:#fff!important;color:#171a1e!important;border-color:#d9dee3!important;box-shadow:0 18px 50px rgba(24,30,36,.10)!important}
html[data-pa-theme="light"] .vehicle-card p{color:#707982!important}
html[data-pa-theme="light"] .vehicle-form select{background:#fff!important;color:#171a1e!important;border-color:#cfd5db!important}
html[data-pa-theme="light"] .listings-section{background:#fff!important;border-top-color:#e0e3e6!important}
html[data-pa-theme="light"] .filter{background:#fff!important;color:#5f6872!important;border-color:#d8dde1!important}
html[data-pa-theme="light"] .detail-btn{background:#fff!important;color:#3e464e!important;border-color:#d8dde1!important}
html[data-pa-theme="light"] .price{color:#171a1e!important}
html[data-pa-theme="light"] .benefits{background:#e9edf0!important;color:#171a1e!important}
html[data-pa-theme="light"] .benefit-grid span{color:#68727c!important}
html[data-pa-theme="light"] footer{background:#eef1f3!important;color:#68727c!important;border-top-color:#d9dde1!important}
html[data-pa-theme="light"] .footer-links a{color:#59636d!important}
html[data-pa-theme="light"] .text-btn{color:#5e6770!important}
html[data-pa-theme="light"] .advanced-filter-toggle,html[data-pa-theme="light"] .advanced-filter-panel{background:#fff!important;color:#171a1e!important;border-color:#d8dde1!important}
html[data-pa-theme="light"] .advanced-filter-grid label{color:#59636d!important}
html[data-pa-theme="light"] .advanced-filter-grid input,html[data-pa-theme="light"] .advanced-filter-grid select{background:#fff!important;color:#171a1e!important;border-color:#d4d9de!important}
html[data-pa-theme="light"] .filter-clear{background:#fff!important;color:#505962!important;border-color:#d4d9de!important}
html[data-pa-theme="dark"] .faq-section{background:#0b0f14!important;border-top-color:#252c34!important}
html[data-pa-theme="dark"] .faq-item{background:#11161c!important;border-color:#303842!important}
html[data-pa-theme="dark"] .faq-item summary{color:#eef1f4!important}
html[data-pa-theme="dark"] .faq-item summary span{color:#aab3bd!important;border-color:#3a424c!important}
html[data-pa-theme="dark"] .faq-item p{color:#9aa4ae!important}
html[data-pa-theme="dark"] .faq-head p{color:#929ca6!important}
html[data-pa-theme="dark"] .about-contact-section{background:#0b0f14!important;border-top-color:#252c34!important}
html[data-pa-theme="dark"] .about-card{background:#11161c!important;color:#eef1f4!important;border-color:#303842!important}
html[data-pa-theme="dark"] .about-card p{color:#9aa4ae!important}
html[data-pa-theme="dark"] .about-points div{background:#151b22!important;border-color:#303842!important}
html[data-pa-theme="dark"] .about-points strong{color:#eef1f4!important}
html[data-pa-theme="dark"] .about-points span{color:#98a2ac!important}
html[data-pa-theme="light"] .faq-section{background:#f5f6f7!important;border-top-color:#dfe3e7!important}
html[data-pa-theme="light"] .faq-item{background:#fff!important;border-color:#d9dee3!important}
html[data-pa-theme="light"] .faq-item summary{color:#171a1e!important}
html[data-pa-theme="light"] .faq-item summary span{color:#69727b!important;border-color:#d9dee3!important}
html[data-pa-theme="light"] .faq-item p{color:#68727c!important}
html[data-pa-theme="light"] .faq-head p{color:#6f7881!important}
html[data-pa-theme="light"] .about-contact-section{background:#f5f6f7!important;border-top-color:#dfe3e7!important}
html[data-pa-theme="light"] .about-card{background:#fff!important;color:#171a1e!important;border-color:#d9dee3!important}
html[data-pa-theme="light"] .about-card p{color:#68727c!important}
html[data-pa-theme="light"] .about-points div{background:#f8f9fa!important;border-color:#dfe3e7!important}
html[data-pa-theme="light"] .about-points strong{color:#171a1e!important}
html[data-pa-theme="light"] .about-points span{color:#737c85!important}
html[data-pa-theme="light"] .category-drawer{background:#fff!important;color:#171a1e!important;border-color:#d9dee3!important}
html[data-pa-theme="light"] .account-drawer-section{background:#fff!important;border-top-color:#e1e4e7!important}
html[data-pa-theme="light"] .account-drawer-head{background:#f7f8f9!important;color:#171a1e!important;border-color:#d7dce1!important}
html[data-pa-theme="light"] .account-drawer-name small{color:#727b84!important}
html[data-pa-theme="light"] .account-drawer-list button{color:#5d6670!important}
html[data-pa-theme="light"] .account-drawer-list button:active,html[data-pa-theme="light"] .account-drawer-list button:focus-visible{background:#eef1f3!important;color:#171a1e!important}
html[data-pa-theme="light"] .account-theme-switch{background:#f5f6f7!important;border-color:#d9dee3!important}
html[data-pa-theme="light"] .account-theme-label{color:#68727c!important}
html[data-pa-theme="light"] .account-theme-option{background:#fff!important;color:#5c6670!important;border-color:#d2d8dd!important}
html[data-pa-theme="light"] .account-theme-option.active{background:#f5b900!important;color:#171a1e!important;border-color:#f5b900!important}
html[data-pa-theme="dark"] .account-theme-option.active{background:#d8ad4a!important;color:#101317!important;border-color:#d8ad4a!important}
html[data-pa-theme="light"] body.account-page-runtime{background:#f5f6f7!important;color:#171a1e!important}
html[data-pa-theme="light"] body.account-page-runtime .account-route-header{background:#fff!important;border-bottom-color:#dfe3e7!important}
html[data-pa-theme="light"] body.account-page-runtime .account-route-header a{color:#171a1e!important}
html[data-pa-theme="light"] body.account-page-runtime .account-route-header a:last-child{color:#66717b!important}
html[data-pa-theme="light"] body.account-page-runtime .account-menu{background:#fff!important;border-color:#d9dee3!important}
html[data-pa-theme="light"] body.account-page-runtime .account-menu-link{background:transparent!important;color:#5d6670!important}
html[data-pa-theme="light"] body.account-page-runtime .account-menu-link:hover{background:#f0f2f4!important;color:#171a1e!important}
html[data-pa-theme="light"] body.account-page-runtime .account-menu-link.active{background:#f5b900!important;color:#171a1e!important}
html[data-pa-theme="light"] body.account-page-runtime .account-menu-link.danger{color:#c84c4c!important}
html[data-pa-theme="light"] body.account-page-runtime .account-pane-head h2,html[data-pa-theme="light"] body.account-page-runtime .account-pane h2,html[data-pa-theme="light"] body.account-page-runtime .account-pane h3{color:#171a1e!important}
html[data-pa-theme="light"] body.account-page-runtime .form-grid label{color:#68727c!important}
html[data-pa-theme="light"] body.account-page-runtime .form-grid input,html[data-pa-theme="light"] body.account-page-runtime .form-grid select{background:#fff!important;color:#171a1e!important;border-color:#d2d8dd!important}
html[data-pa-theme="light"] body.account-page-runtime .pane-row,html[data-pa-theme="light"] body.account-page-runtime .saved-vehicle-row{background:#fff!important;color:#171a1e!important;border-color:#dfe3e7!important}
html[data-pa-theme="light"] body.account-page-runtime .pane-row small,html[data-pa-theme="light"] body.account-page-runtime .saved-vehicle-row small{color:#6f7881!important}
html[data-pa-theme="light"] body.account-page-runtime .pane-empty{color:#69737d!important}
html[data-pa-theme="dark"] body.account-page-runtime{background:#070a0e!important;color:#eef1f4!important}
html[data-pa-theme="dark"] body.account-page-runtime .account-pane-head h2,html[data-pa-theme="dark"] body.account-page-runtime .account-pane h2,html[data-pa-theme="dark"] body.account-page-runtime .account-pane h3{color:#eef1f4!important}
html[data-pa-theme="dark"] .modal-card{background:#11161c!important;color:#eef1f4!important;border-color:#303842!important}
html[data-pa-theme="dark"] .modal-card p{color:#9aa4ae!important}
html[data-pa-theme="light"] .modal-card{background:#fff!important;color:#171a1e!important;border-color:#d9dee3!important}
html[data-pa-theme="light"] .modal-card p{color:#68727c!important}
html[data-pa-theme="light"] .mobile-nav{background:#fff!important;color:#59636d!important;border-top-color:#dfe3e7!important}
html[data-pa-theme="light"] .mobile-nav a,html[data-pa-theme="light"] .mobile-nav button{color:#69737d!important}
html[data-pa-theme="light"] .mobile-nav small{color:#7a848d!important}
html[data-pa-theme="light"] .mobile-nav #mobileSell{background:#f2b500!important;color:#171c21!important;border-color:#fff!important;box-shadow:0 7px 22px rgba(198,148,0,.28),0 0 0 1px #e0e4e8!important}
html[data-pa-theme="light"] .benefit-grid article h2,html[data-pa-theme="light"] .benefit-grid article h3,html[data-pa-theme="light"] .benefit-grid article strong{color:#182028!important;text-shadow:none!important}
html[data-pa-theme="light"] .marketplace-card h2,html[data-pa-theme="light"] .marketplace-card h3,html[data-pa-theme="light"] .vehicle-card h2,html[data-pa-theme="light"] .vehicle-card h3,html[data-pa-theme="light"] .listing-card h2,html[data-pa-theme="light"] .listing-card h3,html[data-pa-theme="light"] .section h2,html[data-pa-theme="light"] .section-head h2{color:#182028!important;text-shadow:none!important}
html[data-pa-theme="light"] body.has-account-route,html[data-pa-theme="light"] body.has-account-route #root{background:#f4f6f8!important;color:#182028!important}
html[data-pa-theme="light"] body.has-account-route .account-route-shell,html[data-pa-theme="light"] body.has-account-route .account-shell,html[data-pa-theme="light"] body.has-account-route .account-pane{background:#f4f6f8!important;color:#182028!important}
html[data-pa-theme="light"] body.has-account-route .account-menu{background:#fff!important;border-color:#d8dee4!important}
html[data-pa-theme="light"] body.has-account-route .profile-hero{background:#fff!important;color:#182028!important;border-color:#d8dee4!important}
html[data-pa-theme="light"] body.has-account-route input,html[data-pa-theme="light"] body.has-account-route select,html[data-pa-theme="light"] body.has-account-route textarea{background:#fff!important;color:#182028!important;border-color:#cfd6dc!important}
html[data-pa-theme="light"] body.has-account-route label{color:#59636d!important}
html[data-pa-theme="light"] body.has-account-route .pane-row,html[data-pa-theme="light"] body.has-account-route .saved-vehicle-row{background:#fff!important;color:#182028!important;border-color:#d8dee4!important}
html[data-pa-theme="light"] body.has-account-route .pane-row strong,html[data-pa-theme="light"] body.has-account-route .profile-hero strong{color:#182028!important}
html[data-pa-theme="light"] body.has-account-route .pane-row small,html[data-pa-theme="light"] body.has-account-route .profile-hero small{color:#68727c!important}
html[data-pa-theme="light"] body.has-account-route button{background:#fff!important;color:#303940!important;border-color:#cfd6dc!important}
html[data-pa-theme="light"] body.has-account-route button.primary,html[data-pa-theme="light"] body.has-account-route .pane-tabs button.active{background:#f2b500!important;color:#171c21!important;border-color:#f2b500!important}
html[data-pa-theme="light"] .site-header .brand-logo .brand-mark{mix-blend-mode:multiply!important;background:transparent!important}
html[data-pa-theme="light"] .site-header .brand-logo{background:transparent!important}
.account-theme-switch{font-variant-numeric:tabular-nums}
`;

function installThemeCss(){
  let style=document.getElementById('parca-avcisi-theme-css');
  if(!style){ style=document.createElement('style'); style.id='parca-avcisi-theme-css'; style.textContent=themeCss; document.head.appendChild(style); }
  return style;
}

function moveThemeCssToCascadeEnd(){
  const style=installThemeCss();
  if(style.parentNode===document.head)document.head.appendChild(style);
}

function getTheme(){
  try { return localStorage.getItem(STORAGE_KEY)==='light'?'light':DEFAULT_THEME; } catch { return DEFAULT_THEME; }
}

function setTheme(theme){
  const next=theme==='light'?'light':'dark';
  document.documentElement.dataset.paTheme=next;
  document.documentElement.style.colorScheme=next;
  try { localStorage.setItem(STORAGE_KEY,next); } catch {}
  const meta=document.querySelector('meta[name="theme-color"]'); if(meta)meta.setAttribute('content',next==='light'?'#ffffff':'#070a0e');
  document.querySelectorAll('[data-pa-theme-choice]').forEach((button)=>{
    const active=button.dataset.paThemeChoice===next;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });
}

function wireThemeEvents(){
  document.addEventListener('click',(event)=>{
    const button=event.target?.closest?.('[data-pa-theme-choice]');
    if(!button)return;
    event.preventDefault();
    setTheme(button.dataset.paThemeChoice);
    moveThemeCssToCascadeEnd();
  });
  const observer=new MutationObserver(()=>setTheme(document.documentElement.dataset.paTheme||getTheme()));
  observer.observe(document.body,{childList:true,subtree:true});
}

installThemeCss();
setTheme(getTheme());
wireThemeEvents();
window.addEventListener('load',()=>setTimeout(moveThemeCssToCascadeEnd,0),{once:true});
setTimeout(moveThemeCssToCascadeEnd,1200);
window.__setParcaTheme=(theme)=>{setTheme(theme);moveThemeCssToCascadeEnd();};
window.__getParcaTheme=getTheme;
