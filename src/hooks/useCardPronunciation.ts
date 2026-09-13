import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { getSetting } from "../db/progressDb";
import { speak } from "../lib/speech";

/** Only pass visible content. For tests, pass the answer after it is revealed. */
export function useCardPronunciation(text: string | undefined, visitKey = text) {
  // Wait for the saved preference; default true could speak before saved false loads.
  const enabled = useLiveQuery(() => getSetting<boolean>("autoPronounce"), []);
  useEffect(() => {
    if (!enabled || !text) return;
    let stop: (() => void) | undefined;
    const timer = setTimeout(() => { stop = speak(text); }, 0);
    return () => { clearTimeout(timer); stop?.(); };
  }, [text, visitKey, enabled]);
}
