/** Public entry control is separate from retained curriculum/backup identities. */
const LV4_U2_HOLD = {
  status: 'source_page_pending',
  message: 'LV4 Unit 02 的 p22 完整來源待補。取得完整來源並核對後開放。',
} as const;

export function unitReleaseHold(level: string | undefined, unit: number | undefined) {
  return level === 'LV4' && unit === 2 ? LV4_U2_HOLD : undefined;
}
export const isUnitPublished = (level: string | undefined, unit: number | undefined) => !unitReleaseHold(level, unit);
