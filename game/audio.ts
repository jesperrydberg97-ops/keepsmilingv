/**
 * Tiny synthesized sound effects (no audio files to download). Silent unless
 * the visitor has turned sound on. Music and video audio come only from
 * embeds the visitor starts themselves, inside overlays, so two sources never
 * play at once from the studio.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noiseBurst(ac: AudioContext, start: number, dur: number, gain: number, freq: number) {
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(start);
}

export const sfx = {
  shutter() {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    noiseBurst(ac, t, 0.035, 0.5, 3200);
    noiseBurst(ac, t + 0.09, 0.05, 0.4, 2200);
  },
  clap() {
    const ac = audio();
    if (!ac) return;
    noiseBurst(ac, ac.currentTime, 0.08, 0.7, 1500);
  },
  chime() {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    for (const [i, f] of [660, 880].entries()) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * 0.08);
      g.gain.linearRampToValueAtTime(0.08, t + i * 0.08 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.6);
      o.connect(g).connect(ac.destination);
      o.start(t + i * 0.08);
      o.stop(t + i * 0.08 + 0.7);
    }
  },
};
