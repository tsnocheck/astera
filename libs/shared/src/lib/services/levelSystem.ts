export function getXPForLevel(level: number): number {
  if (level < 1 || level > 50) return 0;
  return 100 * Math.pow(2, level - 1);
}

export function getLevelUpCost(currentLevel: number): number {
  if (currentLevel < 1 || currentLevel >= 50) return 0;
  const baseCost = 1000;
  const cost = baseCost * Math.pow(2, currentLevel - 1);
  return Math.min(cost, 20000);
}

export function hasReachedMaxXP(currentXP: number, currentLevel: number): boolean {
  const maxXP = getXPForLevel(currentLevel);
  return currentXP >= maxXP;
}

export function getLevelProgress(currentXP: number, currentLevel: number): number {
  const maxXP = getXPForLevel(currentLevel);
  if (maxXP === 0) return 0;
  return Math.min(Math.round((currentXP / maxXP) * 100), 100);
}
