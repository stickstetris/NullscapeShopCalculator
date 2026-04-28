const upgradeGrid = document.getElementById('upgrade-grid');

async function loadUpgrades() {
  try {
    const response = await fetch('./upgrades.json');

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const upgrades = await response.json();
    renderUpgrades(upgrades);
  } catch (error) {
    console.error('Failed to load upgrades:', error);
    upgradeGrid.innerHTML = '<p>Could not load upgrades.</p>';
  }
}

function renderUpgrades(upgrades) {
  upgradeGrid.innerHTML = '';

  upgrades.forEach((upgrade) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'upgrade-card';
    card.setAttribute('aria-label', upgrade.name);

    const image = document.createElement('img');
    image.src = upgrade.image;
    image.alt = upgrade.name;
    image.width = 84;
    image.height = 84;
    image.loading = 'lazy';
    image.className = 'upgrade-image';

    card.append(image);
    upgradeGrid.appendChild(card);
  });
}

loadUpgrades();