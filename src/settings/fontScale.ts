export const FONT_SCALE_OPTIONS = [
  { value: 1, label: "標準", detail: "100%" },
  { value: 1.15, label: "大", detail: "115%" },
  { value: 1.3, label: "特大", detail: "130%" },
] as const;

export type FontScale = (typeof FONT_SCALE_OPTIONS)[number]["value"];

export function normalizeFontScale(value: unknown): FontScale {
  return FONT_SCALE_OPTIONS.some((option) => option.value === value)
    ? value as FontScale
    : 1;
}

export function applyFontScale(value: unknown): FontScale {
  const scale = normalizeFontScale(value);
  if (typeof document !== "undefined") {
    document.documentElement.style.setProperty("--app-font-scale", String(scale));
  }
  return scale;
}
