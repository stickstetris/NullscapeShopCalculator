// Game rules for which upgrades exist in a run and when they can show up in the shop.
// Functions that depend on owned upgrades take the owned Map (name -> count) as an argument.

export const ALTAR_SHOP_MIN_LEVEL = 8;
export const PURIFICATION_SHOP_MIN_LEVEL = 14;

const RADAR_MODULES = [
  'Radar Module: Altars',
  'Radar Module: Enemies',
  'Radar Module: Tripmines',
  'Radar Module: Players',
];

const EXCLUSIVE_GROUPS = [
  ['Aggro Magnet', 'Debuff Magnet'],
  ['Fleeting Fate', 'Panic Necklace'],
];

// Upgrades that never get the Arrogance / Conceit bonus stack.
const NO_BONUS_STACK = ['Defuse Kit'];

export function getMaxStacks(upgrade, settings) {
  const hasBonusStackPrice = Array.isArray(upgrade.stackCosts) && upgrade.stackCosts.length > upgrade.max;
  const getsBonusStack = settings.arroganceConceitDelusion &&
    (upgrade.max > 1 || hasBonusStackPrice) &&
    !NO_BONUS_STACK.includes(upgrade.name);

  return upgrade.max + (getsBonusStack ? 1 : 0);
}

function ownsUpgrade(owned, name, amount = 1) {
  return (owned.get(name) ?? 0) >= amount;
}

export function getExclusiveRivals(upgradeName) {
  return EXCLUSIVE_GROUPS
    .filter((group) => group.includes(upgradeName))
    .flat()
    .filter((name) => name !== upgradeName);
}

export function getOwnedRival(upgrade, owned) {
  return getExclusiveRivals(upgrade.name).find((name) => ownsUpgrade(owned, name)) ?? null;
}

export function getEffectiveMinLevel(upgrade, difficulty) {
  return (difficulty === 'Casual' && upgrade.minLevelCasual != null)
    ? upgrade.minLevelCasual
    : upgrade.minLevel;
}

export function meetsLevelRequirement(upgrade, settings) {
  return settings.currentLevel >= getEffectiveMinLevel(upgrade, settings.difficulty);
}

const ENEMY_REQUIREMENTS = {
  'Pocket Bell': ['Bell'],
  'Radar Module: Instruments': ['Cadence'],
  'Star Marts': ['Mart'],
  'Birthday Pony': ['Springer'],
  'Spring Shoes' : ['Springer'],
  'Jet Boosters': ['Scrapmaw'],
};

export function getEnemyRequirements(upgradeName) {
  return ENEMY_REQUIREMENTS[upgradeName] ?? [];
}

// Returns '' when the prerequisite is met, otherwise text describing what is missing.
// Any text returned here hides the upgrade from the shop; put enemy-only requirements in ENEMY_REQUIREMENTS instead.
export function getPrerequisiteText(upgrade, settings, owned) {
  if (RADAR_MODULES.includes(upgrade.name)) {
    return ownsUpgrade(owned, 'Radar') ? '' : 'Requires Radar';
  }

  switch (upgrade.name) {
    case 'Pocket Bell':
      return ownsUpgrade(owned, 'Double Jump') ? '' : 'Requires Double Jump';
    case 'Panic Necklace':
      return ownsUpgrade(owned, 'Shield') ? '' : 'Requires Shield';
    case 'Subspacial Barrier':
      return (ownsUpgrade(owned, 'Defuse Kit', 3) || settings.difficulty === 'Casual') ? '' : 'Requires 3 stacks of Defuse Kit';
    case 'Shark Tail':
      return ownsUpgrade(owned, 'Ninja Belt') ? '' : 'Requires Ninja Belt';
    case 'Miniature Hourglass':
      return ownsUpgrade(owned, 'Ninja Belt') ? '' : 'Requires Ninja Belt';
    case 'Drowned Ægis':
      return ownsUpgrade(owned, 'More Altars') ? '' : 'Requires More Altars';
    case 'Radar Module: Instruments':
      return ownsUpgrade(owned, 'Radar') ? '' : 'Requires Radar';
    case 'Aggro Magnet':
      return ownsUpgrade(owned, 'Gift Magnet') ? '' : 'Requires Gift Magnet';
    case 'Debuff Magnet':
      return ownsUpgrade(owned, 'Gift Magnet') ? '' : 'Requires Gift Magnet';
    case 'Propeller Hat':
      return ownsUpgrade(owned, 'Helmet') ? '' : 'Requires Helmet';
    case 'Altar Boons':
      return ownsUpgrade(owned, 'Paycheck') ? '' : 'Requires Paycheck';
    case 'Health Insurance':
      return ownsUpgrade(owned, 'Paycheck') ? '' : 'Requires Paycheck';
    default:
      return '';
  }
}

export function isPrerequisiteMet(upgrade, settings, owned) {
  return getPrerequisiteText(upgrade, settings, owned) === '';
}

// Whether an upgrade exists at all for this difficulty / lobby.
export function shouldShowUpgrade(upgrade, settings) {
  switch (upgrade.name) {
    case 'Adrenaline':
      return settings.partySize === 'solo' || settings.partySize === 'duo';
    case 'Defuse Kit':
      return settings.difficulty !== 'Casual';
    case 'Final Stand':
      return settings.playerCount > 2;
    case 'Radar Module: Tripmines':
      return settings.difficulty !== 'Casual';
    case 'Radar Module: Players':
      return settings.playerCount > 1;
    case 'Grace Wings':
      return settings.difficulty !== 'Casual';
    case 'Miniature Hourglass':
      return settings.difficulty !== 'Casual';
    case 'Health Insurance':
      return settings.playerCount > 2 && settings.difficulty !== 'Extreme';
    case 'Soul Tracers':
      return settings.difficulty !== 'Extreme';
    default:
      return true;
  }
}

export function getVisibleSortedUpgrades(upgrades, settings) {
  return upgrades
    .filter((upgrade) => shouldShowUpgrade(upgrade, settings))
    .sort((a, b) => a.minLevel - b.minLevel || a.name.localeCompare(b.name));
}

function isAvailableForShop(upgrade, settings, owned) {
  return shouldShowUpgrade(upgrade, settings) &&
    meetsLevelRequirement(upgrade, settings) &&
    isPrerequisiteMet(upgrade, settings, owned) &&
    !getOwnedRival(upgrade, owned) &&
    (owned.get(upgrade.name) ?? 0) < getMaxStacks(upgrade, settings);
}

export function getShopItems(upgrades, settings, owned) {
  return upgrades
    .filter((upgrade) => isAvailableForShop(upgrade, settings, owned))
    .sort((a, b) => a.minLevel - b.minLevel || a.cost - b.cost || a.name.localeCompare(b.name));
}

// Shops appear on levels ending in 0, 3, 5 or 8.
export function getNextShopLevel(currentLevel) {
  const validDigits = new Set([0, 3, 5, 8]);
  let nextLevel = currentLevel + 1;

  while (!validDigits.has(nextLevel % 10)) {
    nextLevel += 1;
  }

  return nextLevel;
}
