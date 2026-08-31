import { partIcon } from './part-icons.js';

const upgradeIcons = () => {
  document.querySelectorAll('.listing-card').forEach((card) => {
    const art = card.querySelector('.part-art');
    const category = card.querySelector('.listing-meta > span')?.textContent?.trim();
    if (!art || !category || art.dataset.svgIcon === 'true') return;
    art.innerHTML = partIcon(category, category);
    art.dataset.svgIcon = 'true';
  });
};

const observer = new MutationObserver(upgradeIcons);
observer.observe(document.body, { childList: true, subtree: true });
window.addEventListener('load', upgradeIcons);
upgradeIcons();