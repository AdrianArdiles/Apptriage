/**
 * Sonido tipo "Prip" de radio Nextel: doble beep corto.
 * Usa Web Audio API (sin archivo .mp3). Si no hay AudioContext, no hace nada.
 */
function beep(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  gainValue: number
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = frequency;
  osc.type = "sine";
  gain.gain.setValueAtTime(gainValue, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playNotificationSound(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const t0 = ctx.currentTime;
    const vol = 0.2;
    const dur = 0.06;
    const gap = 0.04;
    beep(ctx, 1200, t0, dur, vol);
    beep(ctx, 1200, t0 + dur + gap, dur, vol);
  } catch {
    // Silenciar fallos
  }
}
