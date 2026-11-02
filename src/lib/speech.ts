/** Shared speech lifecycle: a new card replaces the old one's audio. */
export type SpeechIssue = "unsupported" | "blocked" | "failed" | null;
let issue: SpeechIssue = null;
/** Kind the learner closed; auto-play stays quiet about it until audio works again. */
let dismissed: SpeechIssue = null;
const listeners = new Set<() => void>();
let active: { dispose: () => void } | undefined;

export function subscribeSpeech(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function getSpeechIssue() { return issue; }
export function clearSpeechIssue() { setIssue(null); }
/** Learner closed the notice: stop re-showing the same problem on every new card. */
export function dismissSpeechIssue() {
  dismissed = issue;
  setIssue(null);
}
function setIssue(next: SpeechIssue, userInitiated = false) {
  if (next && next === dismissed && !userInitiated) return;
  if (next === issue) return;
  issue = next;
  listeners.forEach((listener) => listener());
}
export function speechAvailable(): boolean {
  return typeof window !== "undefined"
    && typeof window.speechSynthesis?.speak === "function"
    && typeof window.SpeechSynthesisUtterance === "function";
}
export function stopSpeech() {
  active?.dispose();
  active = undefined;
  clearSpeechIssue();
}

/** Cleanup only cancels this request, never a newer card's audio. */
export function speak(text: string, { userInitiated = false } = {}): () => void {
  stopSpeech();
  if (!text.trim()) return () => undefined;
  if (!speechAvailable()) {
    setIssue("unsupported", userInitiated);
    return clearSpeechIssue;
  }
  const synth = window.speechSynthesis;
  let utterance: SpeechSynthesisUtterance | undefined;
  let voiceTimer: ReturnType<typeof setTimeout> | undefined;
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let started = false;
  const request = { dispose };
  active = request;
  function detach() {
    clearTimeout(voiceTimer);
    clearTimeout(startTimer);
    synth.removeEventListener("voiceschanged", tryVoices);
  }
  function dispose() {
    disposed = true;
    detach();
    if (utterance) {
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      synth.cancel();
    }
  }
  function fail(reason: SpeechIssue) {
    if (disposed || active !== request) return;
    dispose();
    setIssue(reason, userInitiated);
  }
  function play() {
    if (disposed || started) return;
    started = true;
    detach();
    try {
      const voices = synth.getVoices();
      const voice = voices.find((v) => v.lang === "en-US" && v.localService)
        ?? voices.find((v) => v.lang === "en-US")
        ?? voices.find((v) => v.lang.startsWith("en"));
      utterance = new window.SpeechSynthesisUtterance(text.split("/").join(", or "));
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      if (voice) utterance.voice = voice;
      utterance.onstart = () => { clearTimeout(startTimer); dismissed = null; setIssue(null); };
      utterance.onend = () => { detach(); };
      utterance.onerror = (event) => {
        if (event.error !== "canceled" && event.error !== "interrupted") {
          fail(event.error === "not-allowed" ? "blocked" : "failed");
        }
      };
      // Keep a strong reference until replaced; do not silently wait forever.
      startTimer = setTimeout(() => fail("failed"), 6000);
      if (synth.paused) synth.resume();
      synth.speak(utterance);
    } catch { fail("failed"); }
  }
  function tryVoices() { if (synth.getVoices().length) play(); }
  if (synth.getVoices().length) play();
  else {
    synth.addEventListener("voiceschanged", tryVoices);
    voiceTimer = setTimeout(play, 1000);
  }
  return () => { if (active === request) stopSpeech(); };
}
