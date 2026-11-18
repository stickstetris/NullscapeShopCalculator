const DEPENDENCE_MULTIPLIER = 0.8;

function isSoloOrDuo(partySize) {
  return partySize === 'solo' || partySize === 'duo';
}

function getAltarPercent(partySize) {
  return isSoloOrDuo(partySize) ? 0.05 : 0.1;
}

function getAltarBasePrice(partySize) {
  return isSoloOrDuo(partySize) ? 12.5 : 50;
}

// Altar prices scale with the Golden Gifts you are holding when you buy them.
export function getProtectionAltarCost(level, settings, goldenGifts) {
  const percent = getAltarPercent(settings.partySize);
  const basePrice = getAltarBasePrice(settings.partySize);
  const levelMult = Math.max(1, level - 4);
  const playerCount = Math.max(1, settings.playerCount);

  const playerMultiplier = isSoloOrDuo(settings.partySize)
    ? playerCount
    : Math.sqrt(playerCount) / 1.75;

  const dependenceMultiplier = settings.dependenceDelusion ? DEPENDENCE_MULTIPLIER : 1;

  return Math.floor(
    ((goldenGifts * percent) + (basePrice * levelMult * playerMultiplier)) * dependenceMultiplier
  );
}
