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

// One-way replacements: owning the key upgrade removes the listed upgrades from the run.
const REPLACEMENTS = {
  'Blossom': ['Transient Pennon', 'Quixotic Wing'],
};

// Upgrades that never get the Arrogance / Conceit bonus stack.
const NO_BONUS_STACK = ['Defuse Kit', 'Altar Boons'];

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

// Upgrades that remove this one from the run when owned (Blossom for the two wing upgrades).
export function getReplacers(upgradeName) {
  return Object.keys(REPLACEMENTS).filter((name) => REPLACEMENTS[name].includes(upgradeName));
}

// Every upgrade that can't be owned alongside this one, in either direction.
export function getConflictingUpgrades(upgradeName) {
  return [...getExclusiveRivals(upgradeName), ...(REPLACEMENTS[upgradeName] ?? []), ...getReplacers(upgradeName)];
}

export function getOwnedRival(upgrade, owned) {
  return [...getExclusiveRivals(upgrade.name), ...getReplacers(upgrade.name)]
    .find((name) => ownsUpgrade(owned, name)) ?? null;
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

export function getEnemyIcon(enemyName) {
  return `assets/enemies/${enemyName.toLowerCase().replace(/ /g, '-')}.png`;
}

export function getEnemyRequirements(upgradeName) {
  return ENEMY_REQUIREMENTS[upgradeName] ?? [];
}

const UPGRADE_REQUIREMENTS = {
  ...Object.fromEntries(RADAR_MODULES.map((name) => [name, { upgrade: 'Radar' }])),
  'Pocket Bell': { upgrade: 'Double Jump' },
  'Panic Necklace': { upgrade: 'Shield' },
  'Subspacial Barrier': { upgrade: 'Defuse Kit', amount: 3, notOnCasual: true },
  'Shark Tail': { upgrade: 'Ninja Belt' },
  'Miniature Hourglass': { upgrade: 'Ninja Belt' },
  'Drowned Ægis': { upgrade: 'More Altars' },
  'Radar Module: Instruments': { upgrade: 'Radar' },
  'Aggro Magnet': { upgrade: 'Gift Magnet' },
  'Debuff Magnet': { upgrade: 'Gift Magnet' },
  'Propeller Hat': { upgrade: 'Helmet' },
  'Altar Boons': { upgrade: 'Paycheck' },
  'Health Insurance': { upgrade: 'Paycheck' },
  'Larger Grapple Points': { upgrade: 'Grapple Points' },
};

export function getMissingRequirement(upgrade, settings, owned) {
  const requirement = UPGRADE_REQUIREMENTS[upgrade.name];

  if (!requirement || (requirement.notOnCasual && settings.difficulty === 'Casual')) {
    return null;
  }

  const amount = requirement.amount ?? 1;
  return ownsUpgrade(owned, requirement.upgrade, amount) ? null : { upgrade: requirement.upgrade, amount };
}

// Returns '' when the prerequisite is met, otherwise text describing what is missing.
// Any text returned here hides the upgrade from the shop.
export function getPrerequisiteText(upgrade, settings, owned) {
  const missing = getMissingRequirement(upgrade, settings, owned);

  if (!missing) {
    return '';
  }

  return missing.amount > 1 ? `${missing.amount} stacks of ${missing.upgrade}` : missing.upgrade;
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
      return settings.playerCount > 3 && settings.difficulty !== 'Extreme';
    case 'Soul Tracers':
      return settings.difficulty !== 'Extreme';
    case 'Blossom':
      return meetsLevelRequirement(upgrade, settings);
    default:
      return true;
  }
}

export function getVisibleSortedUpgrades(upgrades, settings) {
  return upgrades
    .filter((upgrade) => shouldShowUpgrade(upgrade, settings))
    .sort((a, b) => a.minLevel - b.minLevel || a.name.localeCompare(b.name));
}

// Upgrades marked "earned" in upgrades.json (Blossom) are never sold in the shop.
function isAvailableForShop(upgrade, settings, owned) {
  return !upgrade.earned &&
    shouldShowUpgrade(upgrade, settings) &&
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
