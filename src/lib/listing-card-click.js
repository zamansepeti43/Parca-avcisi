const GRID_SELECTOR = '#listingGrid';

function bindListingCards() {
  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid || grid.dataset.cardClickBound === 'true') return;
  grid.dataset.cardClickBound = 'true';

  grid.addEventListener('click', (event) => {
    const card = event.target.closest('.listing-card');
    if (!card || !grid.contains(card)) return;

    // Interactive controls keep their own behavior (favorite, detail, links, forms).
    if (event.target.closest('button, a, input, select, textarea, [data-live-save], [data-detail]')) return;

    const detailButton = card.querySelector('[data-detail]');
    if (detailButton) detailButton.click();
  });

  grid.addEventListener('keydown', (event) => {
    const card = event.target.closest('.listing-card');
    if (!card || event.target !== card) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    const detailButton = card.querySelector('[data-detail]');
    if (detailButton) detailButton.click();
  });

  const refreshCards = () => {
    grid.querySelectorAll('.listing-card').forEach((card) => {
      card.setAttribute('role', 'link');
      card.setAttribute('tabindex', '0');
      card.style.cursor = 'pointer';
    });
  };
  refreshCards();
  new MutationObserver(refreshCards).observe(grid, { childList: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindListingCards);
else bindListingCards();
