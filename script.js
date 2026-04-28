const upgradeGrid = document.getElementById('upgrade-grid');
const tooltip = document.getElementById('upgrade-tooltip');

const currentMoneyInput = document.getElementById('current-money');
const currentLevelInput = document.getElementById('current-level');
const difficultySelect = document.getElementById('difficulty');
const playerCountInput = document.getElementById('player-count');

let allUpgrades = [];
let activeUpgrade = null;
const ownedUpgrades = new Map();

async function loadUpgrades() {
  try {
    const response = await fetch('./upgrades.json');

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    allUpgrades = await response.json();
    refreshUI();
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

function isUpgradeEligibleForRun(upgrade, settings) {
  return true;
}

function getOwnedCount(upgradeName) {
  return ownedUpgrades.get(upgradeName) || 0;
}

function cycleOwnedCount(upgrade) {
  const currentOwned = getOwnedCount(upgrade.name);
  const nextOwned = currentOwned >= upgrade.max ? 0 : currentOwned + 1;

  if (nextOwned === 0) {
    ownedUpgrades.delete(upgrade.name);
  } else {
    ownedUpgrades.set(upgrade.name, nextOwned);
  }
}

function getOwnedUpgradesArray() {
  return allUpgrades
    .filter((upgrade) => ownedUpgrades.has(upgrade.name))
    .map((upgrade) => ({
      ...upgrade,
      owned: ownedUpgrades.get(upgrade.name),
    }));
}

function showTooltip(upgrade) {
  const settings = getCurrentSettings();
  const adjustedCost = getAdjustedCost(upgrade.cost, settings.playerCount, settings.difficulty);
  const owned = getOwnedCount(upgrade.name);

  tooltip.innerHTML = `
    <h3>${upgrade.name}</h3>
    <p><strong>Cost:</strong> ${adjustedCost}</p>
    <p><strong>Owned:</strong> ${owned}/${upgrade.max}</p>
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

function getVisibleSortedUpgrades(upgrades, settings) {
  return [...upgrades]
    .filter((upgrade) => isUpgradeEligibleForRun(upgrade, settings))
    .sort((a, b) => a.minLevel - b.minLevel || a.name.localeCompare(b.name));
}

function renderUpgrades(upgrades) {
  const settings = getCurrentSettings();
  const visibleUpgrades = getVisibleSortedUpgrades(upgrades, settings);

  upgradeGrid.innerHTML = '';

  visibleUpgrades.forEach((upgrade) => {
    const adjustedCost = getAdjustedCost(upgrade.cost, settings.playerCount, settings.difficulty);
    const affordable = canAffordUpgrade(upgrade, settings);
    const availableByLevel = settings.currentLevel >= upgrade.minLevel;
    const owned = getOwnedCount(upgrade.name);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'upgrade-card';
    card.setAttribute('aria-label', `${upgrade.name}, cost ${adjustedCost}, owned ${owned} of ${upgrade.max}`);

    if (!affordable) {
      card.classList.add('locked');
    }

    if (!availableByLevel) {
      card.classList.add('not-yet-available');
    }

    if (owned > 0) {
      card.classList.add('owned');
    }

    if (owned >= upgrade.max) {
      card.classList.add('fully-owned');
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

    const ownedBadge = document.createElement('span');
    ownedBadge.className = 'upgrade-owned';
    ownedBadge.textContent = owned > 0 ? `${owned}/${upgrade.max}` : '';

    card.appendChild(image);
    card.appendChild(cost);
    card.appendChild(ownedBadge);

    card.addEventListener('mouseenter', () => {
      showTooltip(upgrade);
    });

    card.addEventListener('mousemove', moveTooltip);
    card.addEventListener('mouseleave', hideTooltip);

    card.addEventListener('click', () => {
      cycleOwnedCount(upgrade);
      refreshUI();
    });

    upgradeGrid.appendChild(card);
  });
}

function refreshUI() {
  renderUpgrades(allUpgrades);

  if (activeUpgrade) {
    showTooltip(activeUpgrade);
  }

  console.log(getOwnedUpgradesArray());
}

[currentMoneyInput, currentLevelInput, playerCountInput].forEach((input) => {
  input.addEventListener('input', refreshUI);
});

difficultySelect.addEventListener('input', refreshUI);

loadUpgrades();