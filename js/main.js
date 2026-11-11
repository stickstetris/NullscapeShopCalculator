import {
  upgradeGrid,
  purificationShopGrid,
  resetButton,
  purchaseItemsButton,
  currentMoneyInput,
  currentLevelInput,
  nothingCurseInput,
  dependenceDelusionInput,
  arroganceConceitDelusionInput,
  playerCountInput,
  difficultySelect,
  partySizeSelect,
} from './dom.js';
import { fetchUpgrades, fetchCurses } from './data.js';
import {
  getCurrentSettings,
  setSharedGoldenGifts,
  setCurrentLevel,
  resetRunSettings,
  isSoloOrDuoSelected,
  syncPartySizeWithPlayerCount,
} from './settings.js';
import { catalog, ownedUpgrades, clearSelections, clampOwnedToMax } from './state.js';
import { getMaxStacks } from './rules.js';
import { saveState, loadState, clearSavedState } from './storage.js';
import { purchaseSelectedItems } from './cart.js';
import { renderAll } from './ui/render.js';
import { initHowToUseModal } from './ui/modal.js';
import { initUpdateCheck } from './updateCheck.js';

function render() {
  renderAll({ onOwnedChange: update, onSelectionChange: render });
}

function update() {
  render();
  saveState();
}

function resetAll() {
  clearSavedState();

  ownedUpgrades.clear();

  // Solo and duo runs start with a Paycheck.
  if (isSoloOrDuoSelected()) {
    ownedUpgrades.set('Paycheck', 1);
  }

  resetRunSettings();
  clearSelections();
  update();
}

function purchase() {
  const result = purchaseSelectedItems(getCurrentSettings());

  if (!result) {
    return;
  }

  setSharedGoldenGifts(result.remainingMoney);
  setCurrentLevel(result.nextLevel);
  update();
}

async function loadUpgrades() {
  try {
    catalog.upgrades = await fetchUpgrades();
    loadState();
    syncPartySizeWithPlayerCount();
    render();
  } catch (error) {
    console.error('Failed to load upgrades:', error);
    upgradeGrid.innerHTML = '<p>Could not load upgrades.</p>';
  }
}

async function loadCurses() {
  try {
    catalog.curses = await fetchCurses();
    render();
  } catch (error) {
    console.error('Failed to load curses:', error);
    purificationShopGrid.innerHTML = '<p>Could not load curses.</p>';
  }
}

[currentMoneyInput, currentLevelInput, nothingCurseInput, dependenceDelusionInput, difficultySelect, partySizeSelect].forEach((input) => {
  input.addEventListener('input', update);
});

arroganceConceitDelusionInput.addEventListener('input', () => {
  const settings = getCurrentSettings();
  clampOwnedToMax((upgrade) => getMaxStacks(upgrade, settings));
  update();
});

playerCountInput.addEventListener('input', () => {
  syncPartySizeWithPlayerCount();
  update();
});

resetButton.addEventListener('click', resetAll);
purchaseItemsButton.addEventListener('click', purchase);
initHowToUseModal();
initUpdateCheck();

loadUpgrades();
loadCurses();
