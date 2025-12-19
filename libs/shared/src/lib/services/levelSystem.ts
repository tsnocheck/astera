export function getXPForLevel(level: number): number {
  if (level < 1 || level > 50) return 0;
  return 100 * Math.pow(2, level - 1);
}

export function getLevelUpCost(currentLevel: number): number {
  if (currentLevel < 1 || currentLevel >= 50) return 0;
  const cost = currentLevel * 1000;
  return Math.min(cost, 20000);
}

export function getLevelProgress(currentXP: number, currentLevel: number): number {
  const maxXP = getXPForLevel(currentLevel);
  if (maxXP === 0) return 0;
  return Math.min(Math.round((currentXP / maxXP) * 100), 100);
}

export function getCoinBonus(level: number): number {
  if (level < 1) return 1;
  return 1 + (level - 1) * 0.1;
}
