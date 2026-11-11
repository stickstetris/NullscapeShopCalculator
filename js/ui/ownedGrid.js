import { upgradeGrid } from '../dom.js';
import { getVisibleSortedUpgrades, meetsLevelRequirement, isPrerequisiteMet, getOwnedRival, getMaxStacks } from '../rules.js';
import { ownedUpgrades, getOwnedCount, cycleOwnedCount } from '../state.js';
import { getUpgradeCost } from '../cart.js';
import { showTooltip, hideTooltip, moveTooltip } from './tooltip.js';

// "Owned Upgrades" grid: every upgrade in the run; clicking cycles how many you own.
export function renderOwnedGrid(upgrades, settings, onChange) {
  const visibleUpgrades = getVisibleSortedUpgrades(upgrades, settings);
  const hasHoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  upgradeGrid.innerHTML = '';

  visibleUpgrades.forEach((upgrade) => {
    const adjustedCost = getUpgradeCost(upgrade, settings);
    const availableByLevel = meetsLevelRequirement(upgrade, settings);
    // Earned upgrades (e.g. Blossom) have no price, so only the level matters.
    const affordable = (upgrade.earned || settings.currentMoney >= adjustedCost) && availableByLevel;
    const prerequisiteMet = isPrerequisiteMet(upgrade, settings, ownedUpgrades);
    const owned = getOwnedCount(upgrade.name);
    const maxStacks = getMaxStacks(upgrade, settings);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'upgrade-card';
    card.setAttribute(
      'aria-label',
      `${upgrade.name}, cost ${adjustedCost}, owned ${owned} of ${maxStacks}`
    );

    card.classList.toggle('locked', !affordable);
    card.classList.toggle('not-yet-available', !availableByLevel);
    card.classList.toggle('missing-prerequisite', !prerequisiteMet);
    card.classList.toggle('excluded', getOwnedRival(upgrade, ownedUpgrades) !== null);
    card.classList.toggle('owned', owned > 0);
    card.classList.toggle('fully-owned', owned >= maxStacks);

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

    if (!upgrade.earned) {
      card.appendChild(cost);
    }

    if (owned > 0 && maxStacks > 1) {
      const ownedBadge = document.createElement('span');
      ownedBadge.className = 'upgrade-owned';
      ownedBadge.textContent = `${owned}/${maxStacks}`;
      card.appendChild(ownedBadge);
    }

    if (hasHoverPointer) {
      card.addEventListener('mouseenter', () => showTooltip(upgrade));
      card.addEventListener('mousemove', moveTooltip);
      card.addEventListener('mouseleave', hideTooltip);
    }

    card.addEventListener('click', () => {
      cycleOwnedCount(upgrade, maxStacks);
      onChange();
    });

    upgradeGrid.appendChild(card);
  });
}
