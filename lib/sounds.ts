import type { AlarmSoundId } from "@/types/alarms";

export const ALARM_SOUNDS: Array<{
  id: AlarmSoundId;
  name: string;
  description: string;
}> = [
  {
    id: "chime",
    name: "Brisa Cristalina",
    description: "Acorde ascendente suave y amigable.",
  },
  {
    id: "sunrise",
    name: "Amanecer",
    description: "Melodía cálida ideal para mañanas.",
  },
  {
    id: "bell",
    name: "Campana Clara",
    description: "Toque nítido para recordatorios y salidas.",
  },
  {
    id: "marimba",
    name: "Marimba Hogar",
    description: "Ritmo alegre para tareas y pausas.",
  },
  {
    id: "pulse",
    name: "Pulso Enfoque",
    description: "Aviso breve y directo para reuniones o pagos.",
  },
  {
    id: "silent",
    name: "Solo visual (Silencio)",
    description: "Muestra alerta en pantalla sin sonido.",
  },
];

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctor();
  }
  if (sharedAudioCtx.state === "suspended") {
    void sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const start = ctx.currentTime + startOffset;

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(
    Math.max(0.01, volume * 0.28),
    start + 0.03,
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + duration + 0.04);
}

export function playAlarmSound(sound: AlarmSoundId, volume = 0.7): void {
  if (sound === "silent") return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const v = Math.min(1, Math.max(0.1, volume));

  switch (sound) {
    case "chime":
      playTone(ctx, 523.25, 0, 0.35, v, "sine");
      playTone(ctx, 659.25, 0.16, 0.35, v, "sine");
      playTone(ctx, 783.99, 0.32, 0.55, v, "sine");
      break;
    case "sunrise":
      playTone(ctx, 440, 0, 0.45, v * 0.8, "triangle");
      playTone(ctx, 554.37, 0.22, 0.45, v * 0.9, "triangle");
      playTone(ctx, 659.25, 0.44, 0.5, v, "triangle");
      playTone(ctx, 880, 0.68, 0.7, v, "sine");
      break;
    case "bell":
      playTone(ctx, 880, 0, 0.55, v, "sine");
      playTone(ctx, 1318.5, 0.02, 0.45, v * 0.45, "sine");
      playTone(ctx, 880, 0.45, 0.65, v, "sine");
      break;
    case "marimba":
      playTone(ctx, 587.33, 0, 0.18, v, "triangle");
      playTone(ctx, 783.99, 0.15, 0.18, v, "triangle");
      playTone(ctx, 659.25, 0.3, 0.18, v, "triangle");
      playTone(ctx, 880, 0.45, 0.32, v, "triangle");
      break;
    case "pulse":
      playTone(ctx, 698.46, 0, 0.16, v, "sine");
      playTone(ctx, 698.46, 0.22, 0.16, v, "sine");
      playTone(ctx, 932.33, 0.44, 0.3, v, "sine");
      break;
  }
}
