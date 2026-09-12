/* Keep the central mobile sell label below the raised + button and polish saved vehicles. */
(function installMobileSellLabelFix() {
  const STYLE_ID = 'mobile-sell-label-fix-css';
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 760px) {
      .mobile-nav #mobileSell small,
      .mobile-nav .account-mobile-sell small {
        top: 55px !important;
        bottom: auto !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 20 !important;
        line-height: 1.1 !important;
        pointer-events: none !important;
      }
    }
    .saved-vehicles-layout { display:flex; flex-direction:column; gap:18px; }
    .saved-vehicles-list { order:2; }
    .saved-vehicles-add { order:3; margin-top:2px; padding-top:18px; border-top:1px solid rgba(255,255,255,.08); }
    .saved-vehicles-add h3 { margin:0; font-size:18px; color:#f5f7fa; }
    .saved-vehicles-add p { margin:5px 0 0; color:#737b84; font-size:12px; }
    .saved-vehicle-row { display:flex; align-items:center; gap:14px; }
    .saved-vehicle-photo { flex:0 0 82px; width:82px; height:62px; display:grid; place-items:center; border:1px solid rgba(255,255,255,.10); border-radius:14px; background:linear-gradient(145deg,#171b21,#0d1014); overflow:hidden; }
    .saved-vehicle-photo svg { width:70px; height:52px; }
    .saved-vehicle-row .grow { min-width:0; flex:1; }
    @media (max-width:760px) {
      .saved-vehicle-row { align-items:flex-start; flex-wrap:wrap; }
      .saved-vehicle-photo { flex-basis:72px; width:72px; height:56px; }
      .saved-vehicle-row .pane-actions { width:100%; margin-left:86px; }
    }
    html[data-pa-theme="light"] .saved-vehicles-add { border-top-color:rgba(0,0,0,.08); }
    html[data-pa-theme="light"] .saved-vehicles-add h3 { color:#171a1e; }
    html[data-pa-theme="light"] .saved-vehicle-photo { background:linear-gradient(145deg,#f5f6f7,#e9ecef); border-color:#dfe3e7; }
  `;
  document.head.appendChild(style);
})();

(function installSavedVehiclesLayout() {
  function vehicleArt() {
    const wrap = document.createElement('div');
    wrap.className = 'saved-vehicle-photo';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = `
      <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 49.5L22 34C23.3 30.6 26.5 28.4 30.2 28.4H79.5C83.3 28.4 86.8 30.4 88.6 33.8L96 47.5H101C104.9 47.5 108 50.6 108 54.5V59H12V54.5C12 51.9 13.7 49.5 16 49.5Z" fill="#D8A900"/>
        <path d="M28 31.5L24 43H87L81.5 31.5H28Z" fill="#202832"/>
        <path d="M31 33L27.5 41H53V33H31Z" fill="#7D8B98" fill-opacity=".55"/>
        <path d="M56 33V41H84L80.5 33H56Z" fill="#7D8B98" fill-opacity=".55"/>
        <circle cx="29" cy="59" r="9" fill="#090C10" stroke="#8D949D" stroke-width="2"/>
        <circle cx="91" cy="59" r="9" fill="#090C10" stroke="#8D949D" stroke-width="2"/>
        <circle cx="29" cy="59" r="3" fill="#D8A900"/>
        <circle cx="91" cy="59" r="3" fill="#D8A900"/>
        <path d="M13 53H7" stroke="#D8A900" stroke-width="3" stroke-linecap="round"/>
        <path d="M107 53H113" stroke="#D8A900" stroke-width="3" stroke-linecap="round"/>
      </svg>`;
    return wrap;
  }

  function apply() {
    document.querySelectorAll('.account-pane').forEach((pane) => {
      const head = pane.querySelector(':scope > .account-pane-head');
      const form = pane.querySelector(':scope > #savedVehicleForm');
      const list = pane.querySelector(':scope > .pane-list');
      if (!head || !form || !list) return;
      pane.classList.add('saved-vehicles-layout');
      list.classList.add('saved-vehicles-list');
      form.classList.add('saved-vehicles-form');
      if (list.previousElementSibling !== head) head.after(list);
      let addHead = pane.querySelector(':scope > .saved-vehicles-add');
      const title = head.querySelector('h2')?.textContent?.trim() || '';
      const editing = title === 'Aracı Düzenle';
      if (!editing && !addHead) {
        addHead = document.createElement('div');
        addHead.className = 'saved-vehicles-add';
        addHead.innerHTML = '<h3>Yeni Araç Ekle</h3><p>Aracını seçerek Araçlarım listene ekle.</p>';
        list.after(addHead);
      }
      if (addHead && editing) addHead.remove();
      if (addHead && form.previousElementSibling !== addHead) addHead.after(form);
      list.querySelectorAll('.saved-vehicle-row').forEach((row) => {
        if (!row.querySelector('.saved-vehicle-photo')) row.prepend(vehicleArt());
      });
    });
  }
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; apply(); });
  };
  schedule();
  if (document.body) new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true });
})();
