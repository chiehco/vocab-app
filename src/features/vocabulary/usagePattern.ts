export interface UsagePatternItem {
  english: string;
  chinese?: string;
}

function splitPattern(value?: string | null) {
  return value?.split(/[;；]/).map(item => item.trim()).filter(Boolean) ?? [];
}

export function buildUsagePatternItems(
  english?: string | null,
  chinese?: string | null,
): UsagePatternItem[] {
  const englishItems = splitPattern(english);
  const chineseItems = splitPattern(chinese);
  const hasAlignedChinese = englishItems.length > 0 && englishItems.length === chineseItems.length;
  return englishItems.map((item, index) => ({
    english: item,
    chinese: hasAlignedChinese ? chineseItems[index] : undefined,
  }));
}

export function buildUsagePatternDisplay(
  english?: string | null,
  chinese?: string | null,
): { items: UsagePatternItem[]; unalignedChinese?: string } {
  const items = buildUsagePatternItems(english, chinese);
  const chineseCount = splitPattern(chinese).length;
  return {
    items,
    // Preserve the source as one independent note. Unequal lengths do not establish pairs.
    unalignedChinese: items.length > 0 && chineseCount > 0 && items.length !== chineseCount
      ? chinese?.trim()
      : undefined,
  };
}
