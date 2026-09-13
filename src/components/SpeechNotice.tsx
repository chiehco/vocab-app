import { useSyncExternalStore } from "react";
import { clearSpeechIssue, getSpeechIssue, subscribeSpeech } from "../lib/speech";

export default function SpeechNotice() {
  const issue = useSyncExternalStore(subscribeSpeech, getSpeechIssue, () => null);
  if (!issue) return null;
  const copy = issue === "unsupported"
    ? "這個瀏覽器無法播放發音。請複製網址，用 Chrome 或系統瀏覽器開啟。"
    : issue === "blocked"
      ? "自動發音尚未啟用，請點字卡上的喇叭播放。"
      : "發音未能播放，請點喇叭重試；若仍無聲，請確認媒體音量及英文語音設定。";
  return <aside role="status" className="speech-notice"><p>{copy}</p><button type="button" onClick={clearSpeechIssue} aria-label="關閉發音提示">×</button></aside>;
}
