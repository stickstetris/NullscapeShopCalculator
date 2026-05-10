const upgradeGrid = document.getElementById('upgrade-grid');
const tooltip = document.getElementById('upgrade-tooltip');
const resetButton = document.getElementById('reset-all');

const currentMoneyInput = document.getElementById('current-money');
const currentLevelInput = document.getElementById('current-level');
const difficultySelect = document.getElementById('difficulty');
const playerCountInput = document.getElementById('player-count');
const partySizeSelect = document.getElementById('party-size');
const nothingCurseInput = document.getElementById('nothing-curse');

const shopGrid = document.getElementById('shop-grid');
const shopMoney = document.getElementById('shop-money');

const howToUseModal = document.getElementById('how-to-use-modal');
const openHowToUseButton = document.getElementById('open-how-to-use');
const closeHowToUseButton = document.getElementById('close-how-to-use');

const selectedShopItems = new Set();

let allUpgrades = [];
let activeUpgrade = null;
const ownedUpgrades = new Map();

const STORAGE_KEY = 'nullscape-shop-calculator-state';

function saveState() {
  const settings = getCurrentSettings();

  const state = {
    currentMoney: settings.currentMoney,
    currentLevel: settings.currentLevel,
    difficulty: settings.difficulty,
    playerCount: settings.playerCount,
    partySize: settings.partySize,
    nothingCurse: settings.nothingCurse,
    ownedUpgrades: Array.from(ownedUpgrades.entries()),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Could not save state:', error);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return;
    }

    const state = JSON.parse(raw);

    currentMoneyInput.value = state.currentMoney ?? '';
    currentLevelInput.value = state.currentLevel ?? '';
    difficultySelect.value = state.difficulty ?? 'Standard';
    partySizeSelect.value = state.partySize ?? 'solo';
    playerCountInput.value = state.playerCount ?? '';
    nothingCurseInput.checked = Boolean(state.nothingCurse);

    ownedUpgrades.clear();

    if (Array.isArray(state.ownedUpgrades)) {
      state.ownedUpgrades.forEach(([name, count]) => {
        if (typeof name === 'string' && typeof count === 'number' && count > 0) {
          ownedUpgrades.set(name, count);
        }
      });
    }
  } catch (error) {
    console.warn('Could not load state:', error);
  }
}

resetButton.addEventListener('click', () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Could not clear saved state:', error);
  }

  currentLevelInput.value = '3';
  playerCountInput.value = '1';
  difficultySelect.value = 'Standard';
  currentMoneyInput.value = '';
  partySizeSelect.value = 'solo';
  nothingCurseInput.checked = false;

  ownedUpgrades.clear();
  selectedShopItems.clear();

  refreshUI();
  saveState();
});

async function loadUpgrades() {
  try {
    const response = await fetch('./upgrades.json');

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    allUpgrades = await response.json();
    loadState();
    syncPartySizeWithPlayerCount();
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
    partySize: partySizeSelect.value,
    nothingCurse: nothingCurseInput.checked,
  };
}

function getBaseUpgradeCost(upgrade, playerCount, difficulty, partySize) {
  const owned = getOwnedCount(upgrade.name);
  const isCasual = difficulty === 'Casual';
  const isSolo = shouldApplySoloPricing(playerCount, partySize);

  let stackCosts = upgrade.stackCosts;

  if (isSolo && Array.isArray(upgrade.stackCostsSolo)) {
    stackCosts = upgrade.stackCostsSolo;
  } else if (isCasual) {
    if (Array.isArray(upgrade.stackCostsCasual)) {
      stackCosts = upgrade.stackCostsCasual;
    } else if (Array.isArray(upgrade.stackCosts)) {
      stackCosts = upgrade.stackCosts.map((cost) => cost / 2);
    }
  }

  if (Array.isArray(stackCosts) && owned < stackCosts.length) {
    return stackCosts[owned];
  }

  if (isSolo && upgrade.soloCostOverride != null) {
    return upgrade.soloCostOverride;
  }

  if (isCasual) {
    return upgrade.costCasual ?? upgrade.cost;
  }

  return upgrade.cost;
}

function applySoloPricing(price, upgrade, playerCount, partySize) {
  if (!shouldApplySoloPricing(playerCount, partySize)) {
    return price;
  }

  const hasSoloStackOverride = Array.isArray(upgrade.stackCostsSolo);
  const hasSoloCostOverride = upgrade.soloCostOverride != null;

  if (hasSoloStackOverride || hasSoloCostOverride) {
    return price;
  }

  const soloDiscount = upgrade.soloDiscount ?? 0;
  return price * (1 - soloDiscount / 100);
}

function shouldApplySoloPricing(playerCount, partySize) {
  const effectivePartySize = getEffectivePartySize(playerCount, partySize);
  return effectivePartySize === 'solo';
}

function shouldApplyPartyPlusDiscount(playerCount, partySize) {
  const effectivePartySize = getEffectivePartySize(playerCount, partySize);
  return effectivePartySize === 'party-plus' && playerCount > 1;
}

function getEffectivePartySize(playerCount, partySize) {
  if (playerCount > 8) {
    return 'party-plus';
  }

  return partySize;
}

function getAdjustedCost(upgrade, playerCount, difficulty, partySize, nothingCurse = false) {
  let price = getBaseUpgradeCost(upgrade, playerCount, difficulty, partySize);

  price = applySoloPricing(price, upgrade, playerCount, partySize);
  price *= Math.sqrt(playerCount);

  if (shouldApplyPartyPlusDiscount(playerCount, partySize)) {
    price /= 1.125;
  }

  if (difficulty === 'Extreme') {
    price *= 1.15;
  }

  if (nothingCurse) {
    price *= 0.85;
  }

  return Math.ceil(price);
}

function canAffordUpgrade(upgrade, settings) {
  const adjustedCost = getAdjustedCost(
  upgrade,
  settings.playerCount,
  settings.difficulty,
  settings.partySize,
  settings.nothingCurse
);
  return settings.currentMoney >= adjustedCost && settings.currentLevel >= upgrade.minLevel;
}

function isUpgradeEligibleForRun(upgrade, settings) {
  return true;
}

function getOwnedCount(upgradeName) {
  return ownedUpgrades.get(upgradeName) ?? 0;
}

function ownsUpgrade(name, amount = 1) {
  return getOwnedCount(name) >= amount;
}

function getPrerequisiteText(upgrade) {
  const radarModules = [
    'Radar Module: Altars',
    'Radar Module: Enemies',
    'Radar Module: Tripmines',
    'Radar Module: Instruments',
    'Radar Module: Players',
  ];

  if (radarModules.includes(upgrade.name)) {
    return ownsUpgrade('Radar') ? '' : 'Requires Radar';
  }

  switch (upgrade.name) {
    case 'Pocket Bell':
      return ownsUpgrade('Double Jump') ? '' : 'Requires Double Jump and Bell Enemy';
    case 'Panic Necklace':
      return ownsUpgrade('Shield') ? '' : 'Requires Shield';
    case 'Subspacial Barrier':
      return ownsUpgrade('Defuse Kit', 3) ? '' : 'Requires 3 stacks of Defuse Kit';
    default:
      return '';
  }
}

function isPrerequisiteMet(upgrade) {
  return getPrerequisiteText(upgrade) === '';
}

function shouldShowUpgrade(upgrade, settings) {
  switch (upgrade.name) {
    case 'Adrenaline':
      return settings.partySize === 'solo' || settings.partySize === 'duo';

    case 'Defuse Kit':
      return settings.difficulty !== 'Casual';

    case 'Last Robloxian Standing':
      return settings.playerCount > 2;

    case 'Radar Module: Tripmines':
      return settings.difficulty !== 'Casual';

    case 'Radar Module: Players':
      return settings.playerCount > 1;

    case 'Subspacial Barrier':
      return settings.difficulty !== 'Casual';

    case 'Grace Wings':
      return settings.difficulty !== 'Casual';

    default:
      return true;
  }
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

function isAvailableForShop(upgrade, settings) {
  const availableByLevel = settings.currentLevel >= upgrade.minLevel;
  const prerequisiteMet = isPrerequisiteMet(upgrade);
  const visibleForRun = shouldShowUpgrade(upgrade, settings);
  const owned = getOwnedCount(upgrade.name);

  return visibleForRun && availableByLevel && prerequisiteMet && owned < upgrade.max;
}

function getShopItems(upgrades, settings) {
  return [...upgrades]
    .filter((upgrade) => isAvailableForShop(upgrade, settings))
    .sort((a, b) => a.minLevel - b.minLevel || a.cost - b.cost || a.name.localeCompare(b.name));
}

function getShopItemKey(upgrade) {
  return upgrade.name;
}

function getSelectedShopCost(settings) {
  let total = 0;

  selectedShopItems.forEach((upgradeName) => {
    const upgrade = allUpgrades.find((item) => item.name === upgradeName);

    if (upgrade) {
      total += getAdjustedCost(
        upgrade,
        settings.playerCount,
        settings.difficulty,
        settings.partySize,
        settings.nothingCurse
      )
    }
  });

  return total;
}

function getRemainingMoney(settings) {
  return settings.currentMoney - getSelectedShopCost(settings);
}

function canSelectShopItem(upgrade, settings) {
  const itemKey = getShopItemKey(upgrade);
  const alreadySelected = selectedShopItems.has(itemKey);

  if (alreadySelected) {
    return true;
  }

  const remainingMoney = getRemainingMoney(settings);
  const cost = getAdjustedCost(
    upgrade,
    settings.playerCount,
    settings.difficulty,
    settings.partySize,
    settings.nothingCurse
  );

  return remainingMoney >= cost;
}

function syncPartySizeWithPlayerCount() {
  const playerCount = Math.max(1, Number(playerCountInput.value) || 1);
  const currentPartySize = partySizeSelect.value;

  if (playerCount > 8 && currentPartySize === 'party') {
    partySizeSelect.value = 'party-plus';
    return;
  }

  if (playerCount > 1 && currentPartySize === 'solo') {
    partySizeSelect.value = 'party';
  }
}

function toggleShopItem(upgrade) {
  const itemKey = getShopItemKey(upgrade);

  if (selectedShopItems.has(itemKey)) {
    selectedShopItems.delete(itemKey);
  } else {
    selectedShopItems.add(itemKey);
  }
}

function pruneInvalidShopSelections(settings) {
  const validNames = new Set(getShopItems(allUpgrades, settings).map((upgrade) => upgrade.name));

  for (const itemName of selectedShopItems) {
    if (!validNames.has(itemName)) {
      selectedShopItems.delete(itemName);
    }
  }
}

function showTooltip(upgrade) {
  const settings = getCurrentSettings();
  const baseCost = getBaseUpgradeCost(
    upgrade,
    settings.playerCount,
    settings.difficulty,
    settings.partySize
  );
  const adjustedCost = getAdjustedCost(
    upgrade,
    settings.playerCount,
    settings.difficulty,
    settings.partySize,
    settings.nothingCurse
  );
  const owned = getOwnedCount(upgrade.name);
  const prerequisiteText = getPrerequisiteText(upgrade);

  tooltip.innerHTML = `
    <h3>${upgrade.name}</h3>
    <p><strong>Base cost:</strong> ${baseCost}</p>
    <p><strong>Cost:</strong> ${adjustedCost}</p>
    <p><strong>Owned:</strong> ${owned}/${upgrade.max}</p>
    <p><strong>Max:</strong> ${upgrade.max}</p>
    <p><strong>Min level:</strong> ${upgrade.minLevel}</p>
    ${prerequisiteText ? `<p><strong>Requirement:</strong> ${prerequisiteText}</p>` : ''}
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
    .filter((upgrade) => shouldShowUpgrade(upgrade, settings))
    .sort((a, b) => a.minLevel - b.minLevel || a.name.localeCompare(b.name));
}

function openHowToUseModal() {
  howToUseModal.hidden = false;
  openHowToUseButton.setAttribute('aria-expanded', 'true');
  closeHowToUseButton.focus();
}

function closeHowToUseModal() {
  howToUseModal.hidden = true;
  openHowToUseButton.setAttribute('aria-expanded', 'false');
  openHowToUseButton.focus();
}

openHowToUseButton.addEventListener('click', openHowToUseModal);
closeHowToUseButton.addEventListener('click', closeHowToUseModal);

howToUseModal.addEventListener('click', (event) => {
  if (event.target === howToUseModal) {
    closeHowToUseModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !howToUseModal.hidden) {
    closeHowToUseModal();
  }
});

function renderUpgrades(upgrades) {
  const settings = getCurrentSettings();
  const visibleUpgrades = getVisibleSortedUpgrades(upgrades, settings);

  upgradeGrid.innerHTML = '';

  visibleUpgrades.forEach((upgrade) => {
    const adjustedCost = getAdjustedCost(
      upgrade,
      settings.playerCount,
      settings.difficulty,
      settings.partySize,
      settings.nothingCurse
    );
    const affordable = canAffordUpgrade(upgrade, settings);
    const availableByLevel = settings.currentLevel >= upgrade.minLevel;
    const prerequisiteMet = isPrerequisiteMet(upgrade);
    const owned = getOwnedCount(upgrade.name);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'upgrade-card';
    card.setAttribute(
      'aria-label',
      `${upgrade.name}, cost ${adjustedCost}, owned ${owned} of ${upgrade.max}`
    );

    if (!affordable) {
      card.classList.add('locked');
    }

    if (!availableByLevel) {
      card.classList.add('not-yet-available');
    }

    if (!prerequisiteMet) {
      card.classList.add('missing-prerequisite');
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

    card.appendChild(image);
    card.appendChild(cost);

    if (owned > 0 && upgrade.max > 1) {
      const ownedBadge = document.createElement('span');
      ownedBadge.className = 'upgrade-owned';
      ownedBadge.textContent = `${owned}/${upgrade.max}`;
      card.appendChild(ownedBadge);
    }

    card.addEventListener('mouseenter', () => {
      showTooltip(upgrade);
    });

    card.addEventListener('mousemove', moveTooltip);
    card.addEventListener('mouseleave', hideTooltip);

    card.addEventListener('click', () => {
      cycleOwnedCount(upgrade);
      refreshUI();
      saveState();
    });

    upgradeGrid.appendChild(card);
  });
}

function renderShop(upgrades) {
  const settings = getCurrentSettings();
  const shopItems = getShopItems(upgrades, settings);
  const remainingMoney = getRemainingMoney(settings);

  shopMoney.textContent = `Golden Gifts left: ${remainingMoney}`;

  shopGrid.innerHTML = '';

  shopItems.forEach((upgrade) => {
    const cost = getAdjustedCost(
      upgrade,
      settings.playerCount,
      settings.difficulty,
      settings.partySize,
      settings.nothingCurse
    );
    const itemKey = getShopItemKey(upgrade);
    const selected = selectedShopItems.has(itemKey);
    const affordableNow = canSelectShopItem(upgrade, settings);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'shop-card';
    card.setAttribute('aria-label', `${upgrade.name}, cost ${cost}`);

    if (selected) {
      card.classList.add('selected');
    }

    if (!selected && !affordableNow) {
      card.classList.add('unaffordable');
    }

    const image = document.createElement('img');
    image.src = upgrade.image;
    image.alt = upgrade.name;
    image.width = 84;
    image.height = 84;
    image.loading = 'lazy';

    const name = document.createElement('span');
    name.className = 'shop-name';
    name.textContent = upgrade.name;

    const price = document.createElement('span');
    price.className = 'shop-cost';
    price.textContent = `${cost} GG`;

    card.appendChild(image);
    card.appendChild(name);
    card.appendChild(price);

    card.addEventListener('click', () => {
      const currentSettings = getCurrentSettings();
      const selectable = canSelectShopItem(upgrade, currentSettings);

      if (!selected && !selectable) {
        return;
      }

      toggleShopItem(upgrade);
      refreshUI();
    });

    shopGrid.appendChild(card);
  });
}

function refreshUI() {
  const settings = getCurrentSettings();

  pruneInvalidShopSelections(settings);
  renderUpgrades(allUpgrades);
  renderShop(allUpgrades);

  if (activeUpgrade) {
    showTooltip(activeUpgrade);
  }

  console.log(getOwnedUpgradesArray());
  console.log([...selectedShopItems]);
}

[currentMoneyInput, currentLevelInput, nothingCurseInput].forEach((input) => {
  input.addEventListener('input', () => {
    refreshUI();
    saveState();
  });
});

playerCountInput.addEventListener('input', () => {
  syncPartySizeWithPlayerCount();
  refreshUI();
  saveState();
});

[ difficultySelect, partySizeSelect ].forEach((select) => {
  select.addEventListener('input', () => {
    refreshUI();
    saveState();
  });
});

loadUpgrades();