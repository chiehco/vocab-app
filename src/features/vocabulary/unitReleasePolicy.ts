/** Public entry control is separate from retained curriculum/backup identities. */
const LIVEABC_BASIC_UNITS = [1, 2, 3, 4, 5, 6, 7, 8, 10];
export function unitReleaseHold(level: string | undefined, unit: number | undefined) {
  if (level && !/^LV[1-6]$/.test(level) &&
      !(level === 'LIVEABC_BASIC' && LIVEABC_BASIC_UNITS.includes(unit!))) {
    return { status: 'not_available', message: '這個教材單元尚未開放。目前 LiveABC Basic 僅提供照片核對完成的 Unit 01–08、10（Unit 09 待補照片）。' } as const;
  }
  // LV4 U2's intervening p22 is owner-confirmed blank Notes; p11–21 stay intact.
  return undefined;
}
export const isUnitPublished = (level: string | undefined, unit: number | undefined) => !unitReleaseHold(level, unit);
