import './route-pages.css';

const path=window.location.pathname.replace(/\/+$/,'')||'/';
const isListingsPage=path==='/ilanlar';
const ACCOUNT_PATHS=new Set(['/profilim','/ilanlarim','/taleplerim','/mesajlarim','/favorilerim','/kayitli-aramalarim','/bildirimler','/musterilerim','/hesap-bilgileri','/ayarlar','/yardim-destek']);
const isAccountPage=ACCOUNT_PATHS.has(path);
document.body.classList.toggle('is-listings-page',isListingsPage);
document.body.classList.toggle('is-account-page',isAccountPage);

function updateNavigation(){
 document.querySelectorAll('.desktop-nav a').forEach(link=>{const href=link.getAttribute('href');if(href==='#top')link.setAttribute('href','/');if(href==='#ilanlar')link.setAttribute('href','/ilanlar');});
 document.querySelectorAll('footer a').forEach(link=>{const href=link.getAttribute('href');if(href==='#top')link.setAttribute('href','/');if(href==='#ilanlar')link.setAttribute('href','/ilanlar');});
 document.querySelectorAll('.desktop-nav a').forEach(link=>link.classList.remove('active'));
 const active=isListingsPage?document.querySelector('.desktop-nav a[href="/ilanlar"]'):(!isAccountPage?document.querySelector('.desktop-nav a[href="/"]'):null);active?.classList.add('active');
}

function updateAccountSurface(){
 if(!isAccountPage)return;
 document.querySelectorAll('body > header, body > footer, body > .hero, body > .home, body > .home-page, body > .listing-grid, body > .listings-section, body > #home, body > #listingGrid').forEach(el=>el.classList.add('account-route-hidden'));
}
function wirePageNavigation(){document.addEventListener('click',event=>{const link=event.target.closest('a');if(!link)return;const href=link.getAttribute('href')||'';if(href==='#ilanlar'){event.preventDefault();window.location.href='/ilanlar';return;}if(href==='#top'){event.preventDefault();window.location.href='/';}},true);}
updateNavigation();updateAccountSurface();wirePageNavigation();