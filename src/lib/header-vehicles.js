function setupHeaderVehicles() {
  const link = document.querySelector('#headerVehicleLink');
  if (link) {
    link.textContent = 'Araçlarım';
    link.setAttribute('href', '/araclarim');
    link.classList.remove('active');
  }
}

setupHeaderVehicles();
const observer = new MutationObserver(setupHeaderVehicles);
observer.observe(document.body, { childList: true, subtree: true });
