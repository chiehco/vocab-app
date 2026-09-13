/** Coverage estimate only; never writes SRS or assumes that a seen word is mastered. */
export function estimateCoverage(remaining: number, dailyCap: number, daysLeft: number) {
  const words = Math.max(0, Math.ceil(Number.isFinite(remaining) ? remaining : 0));
  const daily = Number.isFinite(dailyCap) ? Math.max(0, Math.floor(dailyCap)) : 0;
  const days = Math.max(0, Math.floor(Number.isFinite(daysLeft) ? daysLeft : 0));
  const firstPassDays = words === 0 ? 0 : daily > 0 ? Math.ceil(words / daily) : null;
  return { remaining: words, daily, firstPassDays,
    spareDays: firstPassDays === null ? null : days - firstPassDays };
}
