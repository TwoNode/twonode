let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  return audioContext;
}

/**
 * A short two-tone chime, synthesized with the Web Audio API rather than a
 * shipped audio file — no asset to host/license, and it's tiny enough that
 * generating it on the fly costs nothing. Browsers block audio before any
 * user gesture on the page, so the very first notification after a fresh
 * load may play silently until the user clicks/types once — same
 * limitation every other in-page notification sound has.
 */
export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const notes: Array<{ freq: number; start: number; duration: number }> = [
      { freq: 880, start: 0, duration: 0.12 },
      { freq: 1108, start: 0.1, duration: 0.16 },
    ];

    for (const note of notes) {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = note.freq;

      const start = now + note.start;
      const end = start + note.duration;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, end);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.02);
    }
  } catch {
    // Non-fatal — a missed chime is a cosmetic loss, never worth surfacing.
  }
}
