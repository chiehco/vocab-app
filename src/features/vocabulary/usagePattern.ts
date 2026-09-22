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
