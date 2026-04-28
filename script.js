const upgradeGrid = document.getElementById('upgrade-grid');
const tooltip = document.getElementById('upgrade-tooltip');

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

function showTooltip(upgrade) {
  tooltip.innerHTML = `
    <h3>${upgrade.name}</h3>
    <p><strong>Cost:</strong> ${upgrade.cost}</p>
    <p><strong>Max:</strong> ${upgrade.max}</p>
    <p><strong>Min level:</strong> ${upgrade.minLevel}</p>
    <p>${upgrade.description}</p>
  `;
  tooltip.hidden = false;
}

function hideTooltip() {
  tooltip.hidden = true;
}

function moveTooltip(event) {
  const offset = 14;
  let x = event.clientX + offset;
  let y = event.clientY + offset;

  const tooltipRect = tooltip.getBoundingClientRect();

  if (x + tooltipRect.width > window.innerWidth) {
    x = event.clientX - tooltipRect.width - offset;
  }

  if (y + tooltipRect.height > window.innerHeight) {
    y = event.clientY - tooltipRect.height - offset;
  }

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
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

    card.appendChild(image);

    card.addEventListener('mouseenter', () => {
      showTooltip(upgrade);
    });

    card.addEventListener('mousemove', moveTooltip);

    card.addEventListener('mouseleave', hideTooltip);

    upgradeGrid.appendChild(card);
  });
}

loadUpgrades();