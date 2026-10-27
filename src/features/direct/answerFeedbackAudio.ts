export interface AudioPermit { context: AudioContext; ready: Promise<boolean> }
const browserContext = () => {
  const Constructor = globalThis.AudioContext ?? (globalThis as typeof globalThis & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
  return Constructor ? new Constructor() : undefined;
};

/** No audio on construction/render. prepare() belongs in the submit gesture;
 * playOnce() belongs after a newly committed result, never in an answer effect. */
export class AnswerFeedbackAudio {
  private context?: AudioContext;
  private played = new Set<string>();
  private active = new Map<OscillatorNode, GainNode>();
  private enabled: () => boolean;
  private createContext: typeof browserContext;
  constructor(enabled: () => boolean, createContext = browserContext) {
    this.enabled = enabled;
    this.createContext = createContext;
  }
  prepare(): AudioPermit | undefined {
    if (!this.enabled()) return;
    try {
      if (!this.context || this.context.state === 'closed') this.context = this.createContext();
      const context = this.context;
      if (!context) return;
      // resume is invoked synchronously in the user gesture, before DB awaits.
      const resume = context.state === 'running' ? Promise.resolve() : context.resume();
      return {context, ready: resume.then(() => context.state === 'running').catch(() => false)};
    } catch { return; }
  }
  async playOnce(answerId: string, correct: boolean, permit?: AudioPermit): Promise<boolean> {
    if (!permit || !this.enabled() || this.played.has(answerId)) return false;
    this.played.add(answerId);
    try {
      if (!await permit.ready || !this.enabled() || this.context !== permit.context || permit.context.state !== 'running') return false;
      const context = permit.context, start = context.currentTime + .005;
      const notes = correct ? [392, 523.25] : [261.63, 220];
      for (let index = 0; index < notes.length; index++) {
        const oscillator = context.createOscillator(), gain = context.createGain();
        const at = start + index * .09, end = at + .12;
        oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(notes[index], at);
        gain.gain.setValueAtTime(.0001, at);
        gain.gain.linearRampToValueAtTime(correct ? .025 : .02, at + .01);
        gain.gain.exponentialRampToValueAtTime(.0001, end);
        oscillator.connect(gain); gain.connect(context.destination);
        this.active.set(oscillator, gain);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.active.delete(oscillator); };
        oscillator.start(at); oscillator.stop(end);
      }
      return true;
    } catch { return false; }
  }
  silence() {
    for (const [oscillator, gain] of this.active) {
      try { oscillator.stop(); oscillator.disconnect(); gain.disconnect(); } catch { /* already ended */ }
    }
    this.active.clear();
  }
  dispose() {
    this.silence();const context=this.context;this.context=undefined;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }
}
