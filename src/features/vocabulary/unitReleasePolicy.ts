/** Public entry control is separate from retained curriculum/backup identities. */
export function unitReleaseHold(level: string | undefined, unit: number | undefined) {
  if (level && !/^LV[1-6]$/.test(level) &&
      !(level === 'LIVEABC_BASIC' && Number.isInteger(unit) && unit! >= 1 && unit! <= 7)) {
    return { status: 'not_available', message: '這個教材單元尚未開放。目前 LiveABC Basic 僅提供照片核對完成的 Unit 01–07。' } as const;
  }
  // LV4 U2's intervening p22 is owner-confirmed blank Notes; p11–21 stay intact.
  return undefined;
}
export const isUnitPublished = (level: string | undefined, unit: number | undefined) => !unitReleaseHold(level, unit);
