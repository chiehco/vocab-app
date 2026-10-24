/** Public entry control is separate from retained curriculum/backup identities. */
const LV4_U2_HOLD = {
  status: 'source_page_pending',
  message: 'LV4 Unit 02 的 p22 完整來源待補。取得完整來源並核對後開放。',
} as const;

const LV6_U21_HOLD = {
  status: 'source_page_pending',
  message: 'LV6 Unit 21 的 p199 完整來源待補。取得完整來源並核對後開放。',
} as const;

export function unitReleaseHold(level: string | undefined, unit: number | undefined) {
  if (level && !/^LV[1-6]$/.test(level) &&
      !(level === 'LIVEABC_BASIC' && Number.isInteger(unit) && unit! >= 1 && unit! <= 7)) {
    return { status: 'not_available', message: '這個教材單元尚未開放。目前 LiveABC Basic 僅提供照片核對完成的 Unit 01–07。' } as const;
  }
  return level === 'LV4' && unit === 2 ? LV4_U2_HOLD
    : level === 'LV6' && unit === 21 ? LV6_U21_HOLD : undefined;
}
export const isUnitPublished = (level: string | undefined, unit: number | undefined) => !unitReleaseHold(level, unit);
