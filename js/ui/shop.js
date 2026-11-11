import { shopGrid, shopMoney } from '../dom.js';
import { getShopItems, getExclusiveRivals } from '../rules.js';
import { ownedUpgrades, selectedShopItems, toggleShopItem } from '../state.js';
import { getUpgradeCost, canSelectShopItem, getCombinedRemainingMoney } from '../cart.js';

// Upgrade shop: what the in-game shop can offer right now. Clicking picks an item to preview buying it.
// Picks over budget are allowed (shown red) so you can see how far short you are.
export function renderShop(upgrades, settings, onChange) {
  const shopItems = getShopItems(upgrades, settings, ownedUpgrades);

  shopMoney.textContent = `Golden Gifts left: ${getCombinedRemainingMoney(settings)}`;

  shopGrid.innerHTML = '';

  shopItems.forEach((upgrade) => {
    const cost = getUpgradeCost(upgrade, settings);
    const selected = selectedShopItems.has(upgrade.name);
    // A picked upgrade that this one is mutually exclusive with (clicking this card swaps the pick).
    const pickedRival = getExclusiveRivals(upgrade.name).find((name) => selectedShopItems.has(name));

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'shop-card';
    card.setAttribute('aria-label', `${upgrade.name}, cost ${cost}`);

    card.classList.toggle('selected', selected);
    card.classList.toggle('unaffordable', !selected && !canSelectShopItem(upgrade, settings));
    card.classList.toggle('excluded', Boolean(pickedRival));

    if (pickedRival) {
      card.title = `Can't be taken with ${pickedRival}`;
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
      toggleShopItem(upgrade);
      onChange();
    });

    shopGrid.appendChild(card);
  });
}
