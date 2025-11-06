export function parseTime(time: string): number {
  const timeRegex = /(\d+)([smhdw])/g;
  let totalMilliseconds = 0;

  let match;
  while ((match = timeRegex.exec(time)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        totalMilliseconds += value * 1000;
        break;
      case 'm':
        totalMilliseconds += value * 60 * 1000;
        break;
      case 'h':
        totalMilliseconds += value * 60 * 60 * 1000;
        break;
      case 'd':
        totalMilliseconds += value * 24 * 60 * 60 * 1000;
        break;
      case 'w':
        totalMilliseconds += value * 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        throw new Error(`Invalid time unit: ${unit}`);
    }
  }

  return totalMilliseconds;
}
