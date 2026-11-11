// Shared app state. Modules import these objects and mutate them in place.
import { getExclusiveRivals, getConflictingUpgrades } from './rules.js';

// Item data loaded from upgrades.json / curses.json.
export const catalog = {
  upgrades: [],
  curses: [],
};

// Upgrade name -> number of stacks owned. Saved to localStorage.
export const ownedUpgrades = new Map();

// Shop planning selections (not saved). Altars map level -> cost frozen at selection time.
export const selectedShopItems = new Set();
export const selectedPurificationItems = new Set();
export const selectedAltars = new Map();

export function findUpgrade(name) {
  return catalog.upgrades.find((upgrade) => upgrade.name === name);
}

export function findCurse(name) {
  return catalog.curses.find((curse) => curse.name === name);
}

export function getOwnedCount(upgradeName) {
  return ownedUpgrades.get(upgradeName) ?? 0;
}

export function cycleOwnedCount(upgrade, maxStacks) {
  const currentOwned = getOwnedCount(upgrade.name);
  const nextOwned = currentOwned >= maxStacks ? 0 : currentOwned + 1;

  if (nextOwned === 0) {
    ownedUpgrades.delete(upgrade.name);
  } else {
    ownedUpgrades.set(upgrade.name, nextOwned);
    getConflictingUpgrades(upgrade.name).forEach((name) => ownedUpgrades.delete(name));
  }
}

// Lower owned counts that are above what the run allows (e.g. after turning Arrogance / Conceit off).
export function clampOwnedToMax(getMax) {
  for (const [name, count] of ownedUpgrades) {
    const upgrade = findUpgrade(name);

    if (upgrade && count > getMax(upgrade)) {
      ownedUpgrades.set(name, getMax(upgrade));
    }
  }
}

export function restoreOwnedUpgrades(entries) {
  ownedUpgrades.clear();

  if (!Array.isArray(entries)) {
    return;
  }

  entries.forEach(([name, count]) => {
    if (typeof name === 'string' && typeof count === 'number' && count > 0) {
      ownedUpgrades.set(name, count);
    }
  });
}

function toggleInSet(set, key) {
  if (set.has(key)) {
    set.delete(key);
  } else {
    set.add(key);
  }
}

export function toggleShopItem(upgrade) {
  toggleInSet(selectedShopItems, upgrade.name);

  // Picking one of a mutually exclusive pair drops the other from the picks.
  if (selectedShopItems.has(upgrade.name)) {
    getExclusiveRivals(upgrade.name).forEach((name) => selectedShopItems.delete(name));
  }
}

export function togglePurificationItem(curse) {
  toggleInSet(selectedPurificationItems, curse.name);
}

export function clearSelections() {
  selectedShopItems.clear();
  selectedPurificationItems.clear();
  selectedAltars.clear();
}
