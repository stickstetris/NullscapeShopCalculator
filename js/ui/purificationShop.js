import { purificationShopGrid, purificationShopMoney, curseSearchInput } from '../dom.js';
import { selectedPurificationItems, togglePurificationItem } from '../state.js';
import { getCurseCost, getCombinedSelectedCost, getCombinedRemainingMoney } from '../cart.js';

const MAX_SHOWN_CURSES = 5;

function getShownCurses(curses, query) {
  const search = query.trim().toLowerCase();
  const picked = curses.filter((curse) => selectedPurificationItems.has(curse.name));
  const matches = curses.filter((curse) =>
    !selectedPurificationItems.has(curse.name) && curse.name.toLowerCase().includes(search));

  return [...picked, ...matches.slice(0, Math.max(0, MAX_SHOWN_CURSES - picked.length))];
}

// Cost to purify curses at the current level.
export function renderPurificationShop(curses, settings, onChange) {
  const combinedSelectedCost = getCombinedSelectedCost(settings);
  const shownCurses = getShownCurses(curses, curseSearchInput.value);

  purificationShopMoney.textContent = `Golden Gifts left: ${getCombinedRemainingMoney(settings)}`;
  purificationShopGrid.innerHTML = '';

  if (shownCurses.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'curse-search-empty';
    empty.textContent = `No curses match "${curseSearchInput.value.trim()}".`;
    purificationShopGrid.appendChild(empty);
    return;
  }

  shownCurses.forEach((curse) => {
    const cost = getCurseCost(curse, settings);
    const selected = selectedPurificationItems.has(curse.name);
    const isAffordable = selected || combinedSelectedCost + cost <= settings.currentMoney;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'shop-card purification-card';
    card.dataset.name = curse.name;
    card.dataset.cost = String(cost);

    if (selected) {
      card.classList.add('is-selected');
    } else if (!isAffordable) {
      card.classList.add('is-unaffordable');
    }

    card.innerHTML = `
      <div class="shop-card-image">
        <img src="${curse.image}" alt="${curse.name}" loading="lazy" width="84" height="84">
      </div>
      <div class="shop-card-content">
        <h3>${curse.name}</h3>
        <strong><span>${cost} GG</span></strong>
      </div>
    `;

    card.addEventListener('click', () => {
      togglePurificationItem(curse);
      onChange();
    });

    purificationShopGrid.appendChild(card);
  });
}
