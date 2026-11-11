import { tooltip } from '../dom.js';
import { getBaseUpgradeCost } from '../pricing/upgrades.js';
import { getEffectiveMinLevel, getPrerequisiteText, getExclusiveRivals, getEnemyRequirements, getMaxStacks, getReplacers, shouldShowUpgrade } from '../rules.js';
import { getCurrentSettings } from '../settings.js';
import { ownedUpgrades, getOwnedCount, findUpgrade } from '../state.js';
import { getUpgradeCost, getPricedStack } from '../cart.js';

const CURSOR_OFFSET = 14;

let activeUpgrade = null;

export function showTooltip(upgrade) {
  activeUpgrade = upgrade;
  tooltip.hidden = false;

  // Special styling for Blossom (earned)
  if (upgrade.earned) {
    tooltip.innerHTML = `
      <h3>${upgrade.name}</h3>
      <p class="earned-description">${upgrade.description}</p>
    `;
    return;
  }

  const settings = getCurrentSettings();
  const owned = getOwnedCount(upgrade.name);
  const baseCost = getBaseUpgradeCost(upgrade, getPricedStack(upgrade, settings), settings);
  const adjustedCost = getUpgradeCost(upgrade, settings);
  const prerequisiteText = getPrerequisiteText(upgrade, settings, ownedUpgrades);
  const rivals = getExclusiveRivals(upgrade.name);
  const enemies = getEnemyRequirements(upgrade.name);
  // Only name replacers that are currently shown, so hidden upgrades (Blossom before level 40) aren't spoiled.
  const replacers = getReplacers(upgrade.name).filter((name) => {
    const replacer = findUpgrade(name);
    return replacer && shouldShowUpgrade(replacer, settings);
  });

  tooltip.innerHTML = `
    <h3>${upgrade.name}</h3>
    <p><strong>Base cost:</strong> ${baseCost}</p>
    <p><strong>Cost:</strong> ${adjustedCost}</p>
    <p><strong>Owned:</strong> ${owned}/${getMaxStacks(upgrade, settings)}</p>
    <p><strong>Max:</strong> ${getMaxStacks(upgrade, settings)}</p>
    <p><strong>Min level:</strong> ${getEffectiveMinLevel(upgrade, settings.difficulty)}</p>
    ${prerequisiteText ? `<p><strong>Requirement:</strong> ${prerequisiteText}</p>` : ''}
    ${enemies.length ? `<p><strong>Requires enemy:</strong> ${enemies.join(', ')}</p>` : ''}
    ${rivals.length ? `<p><strong>Exclusive with:</strong> ${rivals.join(', ')}</p>` : ''}
    ${replacers.length ? `<p><strong>Removed by:</strong> ${replacers.join(', ')}</p>` : ''}
    <p>${upgrade.description}</p>
  `;
}

export function hideTooltip() {
  tooltip.hidden = true;
  activeUpgrade = null;
}

// Re-render the open tooltip so its numbers follow the latest settings.
export function refreshTooltip() {
  if (activeUpgrade) {
    showTooltip(activeUpgrade);
  }
}

export function moveTooltip(event) {
  let x = event.clientX + CURSOR_OFFSET;
  let y = event.clientY + CURSOR_OFFSET;

  const tooltipRect = tooltip.getBoundingClientRect();

  if (x + tooltipRect.width > window.innerWidth) {
    x = event.clientX - tooltipRect.width - CURSOR_OFFSET;
  }

  if (y + tooltipRect.height > window.innerHeight) {
    y = event.clientY - tooltipRect.height - CURSOR_OFFSET;
  }

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}
