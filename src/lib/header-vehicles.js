function setupHeaderVehicles() {
  const link = document.querySelector('#headerVehicleLink');
  if (link) {
    link.textContent = 'Araçlarım';
    link.setAttribute('href', '/araclarim');
    link.removeAttribute('id');
    link.classList.remove('active');
  }

  document.querySelectorAll('.saved-vehicles-nav').forEach((node) => node.remove());
}

setupHeaderVehicles();
const observer = new MutationObserver(setupHeaderVehicles);
observer.observe(document.body, { childList: true, subtree: true });
