import './account-drawer-ui.css';
import { getCurrentUser, signOut } from './auth.js';
import { getUnreadNotificationsCount } from './notifications.js';

const LABELS=[['profilim','Profilim'],['ilanlarim','İlanlarım'],['araclarim','Araçlarım'],['taleplerim','Taleplerim'],['mesajlarim','Mesajlarım'],['favorilerim','Favorilerim'],['kayitli-aramalar','Kayıtlı Aramalarım'],['bildirimler','Bildirimler'],['musterilerim','Müşterilerim'],['hesap-bilgileri','Hesap Bilgileri'],['ayarlar','Ayarlar'],['yardim','Yardım & Destek']];
const ROUTES={profilim:'/profilim',ilanlarim:'/ilanlarim',araclarim:'/araclarim',taleplerim:'/taleplerim',mesajlarim:'/mesajlarim',favorilerim:'/favorilerim','kayitli-aramalar':'/kayitli-aramalarim',bildirimler:'/bildirimler',musterilerim:'/musterilerim', 'hesap-bilgileri':'/hesap-bilgileri',ayarlar:'/ayarlar',yardim:'/yardim-destek'};

async function renderAccount(){
 const drawer=document.querySelector('.category-drawer'); if(!drawer||drawer.querySelector('.account-drawer-section'))return;
 const user=await getCurrentUser().catch(()=>null); const section=document.createElement('section'); section.className='account-drawer-section';
 const title=user?(user.user_metadata?.full_name||user.email?.split('@')[0]||'Hesabım'):'Hesabım'; const initial=title.trim().charAt(0).toLocaleUpperCase('tr-TR')||'H'; let unread=0;
 if(user)unread=await getUnreadNotificationsCount().catch(()=>0);
 const themeHtml=user?`<div class="account-theme-switch" role="group" aria-label="Tema seçimi"><span class="account-theme-label">Tema</span><button type="button" class="account-theme-option" data-pa-theme-choice="light">☀ Açık</button><button type="button" class="account-theme-option" data-pa-theme-choice="dark">☾ Koyu</button></div>`:'';
 section.innerHTML=user?`<button type="button" class="account-drawer-head" aria-expanded="false"><span class="account-avatar">${initial}</span><span class="account-drawer-name"><strong>${title}</strong><small>Hesabım</small></span><b>›</b></button><div class="account-drawer-list" hidden>${LABELS.map(([key,label])=>`<button type="button" data-account-pane="${key}"><span>${label}</span>${key==='bildirimler'&&unread?`<em>${unread>9?'9+':unread}</em>`:''}</button>`).join('')}${themeHtml}<button type="button" class="account-signout" data-account-signout>Çıkış Yap</button></div>`:`<button type="button" class="account-drawer-head" aria-expanded="false"><span class="account-avatar">G</span><span class="account-drawer-name"><strong>Hesabım</strong><small>Giriş yap veya kayıt ol</small></span><b>›</b></button><div class="account-drawer-list" hidden><button type="button" data-account-auth="login">Giriş Yap</button><button type="button" data-account-auth="signup">Ücretsiz Kayıt Ol</button></div>`;
 drawer.appendChild(section);
 section.querySelector('.account-drawer-head').addEventListener('click',()=>{const list=section.querySelector('.account-drawer-list');const open=section.querySelector('.account-drawer-head').getAttribute('aria-expanded')==='true';section.querySelector('.account-drawer-head').setAttribute('aria-expanded',String(!open));list.hidden=open;section.classList.toggle('expanded',!open);});
 section.addEventListener('click',async event=>{
  const theme=event.target.closest('[data-pa-theme-choice]'); if(theme){event.preventDefault();event.stopPropagation();window.__setParcaTheme?.(theme.dataset.paThemeChoice);return;}
  const pane=event.target.closest('[data-account-pane]'); if(pane){event.preventDefault();event.stopPropagation();document.querySelector('.category-close')?.click();const route=ROUTES[pane.dataset.accountPane];if(route){window.location.assign(route);return;}window.__accountPageNavigation?.navigateToPane?.(pane.dataset.accountPane);return;}
  const auth=event.target.closest('[data-account-auth]');if(auth){event.preventDefault();event.stopPropagation();document.querySelector('.category-close')?.click();window.__openAuth?.();setTimeout(()=>document.querySelector(auth.dataset.accountAuth==='signup'?'[data-open-signup]':'[data-open-login]')?.click(),0);return;}
  const out=event.target.closest('[data-account-signout]');if(out){event.preventDefault();event.stopPropagation();await signOut().catch(()=>{});location.reload();}
 });
}
const observer=new MutationObserver(renderAccount);observer.observe(document.body,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderAccount);else renderAccount();