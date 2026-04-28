const upgradeGrid = document.getElementById('upgrade-grid');
const tooltip = document.getElementById('upgrade-tooltip');

const currentMoneyInput = document.getElementById('current-money');
const currentLevelInput = document.getElementById('current-level');
const difficultySelect = document.getElementById('difficulty');
const playerCountInput = document.getElementById('player-count');

let allUpgrades = [];
let activeUpgrade = null;

async function loadUpgrades() {
  try {
    const response = await fetch('./upgrades.json');

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    allUpgrades = await response.json();
    renderUpgrades(allUpgrades);
  } catch (error) {
    console.error('Failed to load upgrades:', error);
    upgradeGrid.innerHTML = '<p>Could not load upgrades.</p>';
  }
}

function getCurrentSettings() {
  return {
    currentMoney: Number(currentMoneyInput.value) || 0,
    currentLevel: Number(currentLevelInput.value) || 1,
    difficulty: difficultySelect.value,
    playerCount: Math.max(1, Number(playerCountInput.value) || 1),
  };
}

function getAdjustedCost(basePrice, playerCount, difficulty) {
  let price = basePrice * Math.sqrt(playerCount);

  if (playerCount > 8) {
    price /= 1.125;
  }

  if (difficulty === 'Extreme') {
    price *= 1.15;
  }

  return Math.ceil(price);
}

function canAffordUpgrade(upgrade, settings) {
  const adjustedCost = getAdjustedCost(upgrade.cost, settings.playerCount, settings.difficulty);
  return settings.currentMoney >= adjustedCost && settings.currentLevel >= upgrade.minLevel;
}

function showTooltip(upgrade) {
  const settings = getCurrentSettings();
  const adjustedCost = getAdjustedCost(upgrade.cost, settings.playerCount, settings.difficulty);

  tooltip.innerHTML = `
    <h3>${upgrade.name}</h3>
    <p><strong>Cost:</strong> ${adjustedCost}</p>
    <p><strong>Max:</strong> ${upgrade.max}</p>
    <p><strong>Min level:</strong> ${upgrade.minLevel}</p>
    <p>${upgrade.description}</p>
  `;

  tooltip.hidden = false;
  activeUpgrade = upgrade;
}

function hideTooltip() {
  tooltip.hidden = true;
  activeUpgrade = null;
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
  const settings = getCurrentSettings();
  upgradeGrid.innerHTML = '';

  upgrades.forEach((upgrade) => {
    const adjustedCost = getAdjustedCost(upgrade.cost, settings.playerCount, settings.difficulty);
    const affordable = canAffordUpgrade(upgrade, settings);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'upgrade-card';
    card.setAttribute('aria-label', `${upgrade.name}, cost ${adjustedCost}`);

    if (!affordable) {
      card.classList.add('locked');
    }

    const image = document.createElement('img');
    image.src = upgrade.image;
    image.alt = upgrade.name;
    image.width = 84;
    image.height = 84;
    image.loading = 'lazy';

    const cost = document.createElement('span');
    cost.className = 'upgrade-cost';
    cost.textContent = adjustedCost;

    card.appendChild(image);
    card.appendChild(cost);

    card.addEventListener('mouseenter', () => {
      showTooltip(upgrade);
    });

    card.addEventListener('mousemove', moveTooltip);

    card.addEventListener('mouseleave', hideTooltip);

    upgradeGrid.appendChild(card);
  });
}

function refreshUI() {
  renderUpgrades(allUpgrades);

  if (activeUpgrade) {
    showTooltip(activeUpgrade);
  }
}

[currentMoneyInput, currentLevelInput, playerCountInput].forEach((input) => {
  input.addEventListener('input', refreshUI);
});

difficultySelect.addEventListener('input', refreshUI);

loadUpgrades();