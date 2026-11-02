// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { dismissSpeechIssue, getSpeechIssue, speak, stopSpeech } from "./speech";

afterEach(() => { stopSpeech(); vi.unstubAllGlobals(); });

it("keeps a dismissed notice closed for later auto-play, but not for a speaker tap", () => {
  vi.stubGlobal("speechSynthesis", undefined);
  speak("boy");
  expect(getSpeechIssue()).toBe("unsupported");

  dismissSpeechIssue();
  speak("girl");
  expect(getSpeechIssue()).toBeNull();

  speak("girl", { userInitiated: true });
  expect(getSpeechIssue()).toBe("unsupported");
});
