/** 用瀏覽器內建語音合成唸英文單字/句子。優先挑英語語音。 */

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis?.getVoices() ?? [];
  cachedVoice =
    voices.find((v) => v.lang === "en-US" && v.localService) ??
    voices.find((v) => v.lang === "en-US") ??
    voices.find((v) => v.lang.startsWith("en")) ??
    null;
  return cachedVoice;
}

// 部分瀏覽器（Chrome）語音清單是非同步載入的
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickEnglishVoice();
  };
}

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string): void {
  if (!speechAvailable()) return;
  // 單字表裡的 a/an、actor/actress 這種寫法，唸的時候用 or 連接比較自然
  const spoken = text.includes("/") ? text.split("/").join(", or ") : text;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(spoken);
  u.lang = "en-US";
  u.rate = 0.9;
  const voice = pickEnglishVoice();
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}
