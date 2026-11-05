/**
 * 효과음. 소리 파일 없이 Web Audio로 그 자리에서 합성한다 (배경음은 없음).
 * 켜기/끄기 설정은 localStorage 에 저장한다.
 */
const KEY = 'realmguard.sound';

export type Sfx =
  | 'click' | 'build' | 'upgrade' | 'sell' | 'rally'
  | 'arrow' | 'magic' | 'cannon' | 'thunder' | 'frost'
  | 'hit' | 'die' | 'coin' | 'leak' | 'wave'
  | 'fire' | 'reinf' | 'hero' | 'win' | 'lose' | 'boss' | 'breath' | 'smash';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = readEnabled();
const last: Partial<Record<Sfx, number>> = {};
let noiseBuf: AudioBuffer | null = null;

function readEnabled(): boolean {
  try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; }
}

export function soundOn(): boolean { return enabled; }

export function setSound(on: boolean): void {
  enabled = on;
  try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch { /* ignore */ }
  if (on) play('click');
}

/** 브라우저는 사용자가 한 번 누르기 전에는 소리를 막으므로, 첫 입력 때 오디오를 깨운다 */
function ensure(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

if (typeof window !== 'undefined') {
  const unlock = () => { ensure(); };
  // iOS 사파리는 pointerdown 이 아니라 touchend/click 안에서 깨워야 소리가 나므로 함께 건다
  for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) window.addEventListener(ev, unlock, { passive: true });
}

/** 음 하나: 시작 주파수에서 끝 주파수로 미끄러지며 사라진다 */
function tone(c: AudioContext, t0: number, freq: number, dur: number, type: OscillatorType, vol: number, to = freq) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (to !== freq) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master!);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

/** 서서히 커졌다가 사라지는 긴 음 (보스 등장의 낮은 울림, 금관 화음용) */
function swell(c: AudioContext, t0: number, freq: number, dur: number, type: OscillatorType, vol: number, peak = 0.45) {
  const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  f.type = 'lowpass';
  f.frequency.setValueAtTime(freq * 5, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + dur * peak);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(f).connect(g).connect(master!);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

/** 잡음(타격, 폭발, 바람 소리 등). lo/hi 는 필터가 지나가는 주파수 범위 */
function noise(c: AudioContext, t0: number, dur: number, vol: number, lo = 200, hi = 4000) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
  s.buffer = noiseBuf;
  f.type = 'bandpass';
  f.frequency.setValueAtTime(Math.sqrt(lo * hi), t0);
  f.Q.value = 0.6;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g).connect(master!);
  s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.02);
}

/** 같은 소리가 한꺼번에 겹치지 않도록 최소 간격(초)과 볼륨 */
const GAP: Record<Sfx, number> = {
  click: 0.05, build: 0.1, upgrade: 0.1, sell: 0.1, rally: 0.1,
  arrow: 0.07, magic: 0.08, cannon: 0.1, thunder: 0.12, frost: 0.1,
  hit: 0.06, die: 0.05, coin: 0.06, leak: 0.2, wave: 0.5,
  fire: 0.1, reinf: 0.2, hero: 0.2, win: 1, lose: 1, boss: 3, breath: 0.5, smash: 0.12,
};

export function play(name: Sfx): void {
  if (!enabled) return;
  const c = ensure();
  if (!c || c.state !== 'running') return;
  const t0 = c.currentTime;
  if (t0 - (last[name] ?? -9) < GAP[name]) return;
  last[name] = t0;

  switch (name) {
    case 'click': tone(c, t0, 700, 0.05, 'triangle', 0.18); break;
    case 'build':
      noise(c, t0, 0.09, 0.35, 300, 2500);
      tone(c, t0, 180, 0.12, 'square', 0.18, 90);
      tone(c, t0 + 0.09, 520, 0.14, 'triangle', 0.2, 780);
      break;
    case 'upgrade':
      tone(c, t0, 523, 0.1, 'triangle', 0.22);
      tone(c, t0 + 0.08, 659, 0.1, 'triangle', 0.22);
      tone(c, t0 + 0.16, 784, 0.18, 'triangle', 0.24);
      break;
    case 'sell':
      tone(c, t0, 1320, 0.08, 'square', 0.12);
      tone(c, t0 + 0.07, 1760, 0.16, 'square', 0.12);
      break;
    case 'rally': tone(c, t0, 440, 0.08, 'sawtooth', 0.14, 660); tone(c, t0 + 0.08, 660, 0.12, 'sawtooth', 0.14); break;
    case 'arrow': noise(c, t0, 0.07, 0.22, 1500, 6000); tone(c, t0, 900, 0.06, 'triangle', 0.1, 400); break;
    case 'magic': tone(c, t0, 480, 0.2, 'sine', 0.2, 1100); tone(c, t0, 720, 0.2, 'sine', 0.1, 1500); break;
    case 'cannon': tone(c, t0, 140, 0.25, 'sawtooth', 0.35, 40); noise(c, t0, 0.22, 0.4, 100, 900); break;
    case 'thunder': noise(c, t0, 0.18, 0.4, 800, 7000); tone(c, t0, 1400, 0.14, 'sawtooth', 0.18, 200); break;
    case 'frost': tone(c, t0, 1500, 0.2, 'sine', 0.16, 900); tone(c, t0 + 0.04, 2000, 0.18, 'sine', 0.1, 1200); break;
    case 'hit': noise(c, t0, 0.05, 0.22, 300, 2000); tone(c, t0, 200, 0.05, 'square', 0.1, 120); break;
    case 'die': tone(c, t0, 360, 0.18, 'square', 0.14, 90); noise(c, t0, 0.1, 0.15, 200, 1500); break;
    case 'coin': tone(c, t0, 1568, 0.06, 'square', 0.1); tone(c, t0 + 0.05, 2093, 0.12, 'square', 0.1); break;
    case 'leak': tone(c, t0, 220, 0.3, 'sawtooth', 0.3, 80); tone(c, t0, 233, 0.3, 'sawtooth', 0.25, 85); break;
    case 'wave':
      tone(c, t0, 330, 0.25, 'sawtooth', 0.22);
      tone(c, t0 + 0.22, 392, 0.25, 'sawtooth', 0.22);
      tone(c, t0 + 0.44, 494, 0.4, 'sawtooth', 0.24);
      break;
    case 'fire': noise(c, t0, 0.5, 0.4, 100, 1200); tone(c, t0, 120, 0.45, 'sawtooth', 0.3, 40); break;
    case 'reinf': tone(c, t0, 392, 0.12, 'triangle', 0.22); tone(c, t0 + 0.1, 587, 0.2, 'triangle', 0.24); break;
    case 'hero': tone(c, t0, 300, 0.3, 'sawtooth', 0.28, 700); noise(c, t0, 0.25, 0.3, 300, 4000); break;
    case 'win':
      [523, 659, 784, 1047].forEach((f, i) => tone(c, t0 + i * 0.14, f, i === 3 ? 0.5 : 0.16, 'triangle', 0.26));
      break;
    case 'boss':
      // 보스 등장(약 4초): 낮은 울림이 커지고, 북소리 다섯 번, 스산한 바람, 마지막에 금관 화음
      swell(c, t0, 55, 3.8, 'sawtooth', 0.26);
      swell(c, t0, 82.4, 3.8, 'sawtooth', 0.15);
      swell(c, t0 + 0.3, 41.2, 3.5, 'sine', 0.35);
      for (let i = 0; i < 5; i++) { tone(c, t0 + 0.2 + i * 0.6, 120, 0.4, 'sine', 0.5, 42); noise(c, t0 + 0.2 + i * 0.6, 0.12, 0.2, 80, 700); }
      for (let i = 0; i < 4; i++) noise(c, t0 + i * 0.9, 1.1, 0.1, 400, 3000);
      swell(c, t0 + 2.4, 146.8, 1.6, 'sawtooth', 0.13);
      swell(c, t0 + 2.4, 220, 1.6, 'sawtooth', 0.11);
      swell(c, t0 + 2.4, 277.2, 1.6, 'sawtooth', 0.09);
      break;
    case 'breath':
      // 용의 포효와 불꽃: 낮게 갈라지는 소리 + 거친 바람
      noise(c, t0, 1.0, 0.45, 80, 1800);
      tone(c, t0, 95, 1.0, 'sawtooth', 0.38, 40);
      tone(c, t0 + 0.05, 140, 0.8, 'square', 0.14, 60);
      break;
    case 'smash':
      noise(c, t0, 0.25, 0.4, 100, 1500);
      tone(c, t0, 150, 0.25, 'sawtooth', 0.3, 45);
      break;
    case 'lose':
      [392, 349, 311, 262].forEach((f, i) => tone(c, t0 + i * 0.2, f, i === 3 ? 0.6 : 0.22, 'sawtooth', 0.22));
      break;
  }
}
