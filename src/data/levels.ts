import type { Vec } from '../game/path';
import type { EnemyKind } from './enemies';

export interface WaveGroup {
  kind: EnemyKind;
  count: number;
  interval: number;
  delay?: number;
  path?: number;
}

export interface Wave {
  groups: WaveGroup[];
  /** 이 시간(초) 뒤 다음 웨이브가 자동 시작 */
  time: number;
}

export type Theme = 'meadow' | 'desert' | 'snow';

export interface LevelDef {
  id: number;
  name: string;
  theme: Theme;
  paths: { pts: Vec[]; air?: boolean }[];
  spots: Vec[];
  waves: Wave[];
  startGold: number;
  lives: number;
}

const p = (x: number, y: number): Vec => ({ x, y });
const g = (kind: EnemyKind, count: number, interval: number, delay = 0, path = 0): WaveGroup =>
  ({ kind, count, interval, delay, path });

export const LEVELS: LevelDef[] = [
  {
    id: 1, name: '초원의 입구', theme: 'meadow', startGold: 260, lives: 20,
    paths: [{ pts: [p(-30, 130), p(220, 130), p(220, 400), p(480, 400), p(480, 160), p(740, 160), p(740, 420), p(990, 420)] }],
    spots: [
      p(100, 200), p(100, 60), p(290, 250), p(150, 300), p(350, 330), p(350, 470),
      p(410, 250), p(550, 280), p(610, 230), p(610, 90), p(680, 300), p(810, 300), p(850, 350), p(850, 490),
    ],
    waves: [
      { time: 22, groups: [g('goblin', 8, 1.2)] },
      { time: 24, groups: [g('goblin', 10, 1.0), g('wolf', 4, 0.8, 6)] },
      { time: 26, groups: [g('goblin', 8, 0.9), g('orc', 2, 3, 5)] },
      { time: 26, groups: [g('wolf', 10, 0.6), g('goblin', 10, 0.8, 7)] },
      { time: 28, groups: [g('orc', 5, 2.2), g('goblin', 12, 0.7, 4)] },
      { time: 28, groups: [g('wolf', 8, 0.5), g('orc', 4, 2, 3), g('goblin', 10, 0.6, 8)] },
      { time: 30, groups: [g('orc', 8, 1.6), g('wolf', 10, 0.5, 6)] },
      { time: 0, groups: [g('ogre', 1, 1), g('goblin', 20, 0.6, 3), g('orc', 4, 2.5, 10)] },
    ],
  },
  {
    id: 2, name: '사막의 갈림길', theme: 'desert', startGold: 300, lives: 20,
    paths: [
      { pts: [p(-30, 100), p(300, 100), p(300, 270), p(560, 270), p(560, 380), p(990, 380)] },
      { pts: [p(-30, 470), p(300, 470), p(300, 270), p(560, 270), p(560, 380), p(990, 380)] },
    ],
    spots: [
      p(210, 160), p(210, 40), p(380, 200), p(210, 400), p(110, 410), p(400, 350), p(450, 200),
      p(660, 320), p(660, 440), p(800, 320), p(800, 440), p(500, 330),
    ],
    waves: [
      { time: 20, groups: [g('goblin', 6, 1.2, 0, 0), g('goblin', 6, 1.2, 0.6, 1)] },
      { time: 22, groups: [g('wolf', 6, 0.8, 0, 0), g('wolf', 6, 0.8, 0.4, 1)] },
      { time: 24, groups: [g('goblin', 8, 0.9, 0, 0), g('orc', 2, 3, 2, 1), g('goblin', 8, 0.9, 0.5, 1)] },
      { time: 26, groups: [g('orc', 3, 2.2, 0, 0), g('wolf', 10, 0.5, 3, 1)] },
      { time: 26, groups: [g('goblin', 14, 0.5, 0, 0), g('goblin', 14, 0.5, 0.25, 1), g('orc', 3, 2.5, 6, 0)] },
      { time: 28, groups: [g('orc', 5, 2, 0, 1), g('wolf', 12, 0.45, 2, 0), g('orc', 3, 2, 8, 0)] },
      { time: 30, groups: [g('wolf', 14, 0.4, 0, 0), g('wolf', 14, 0.4, 0.2, 1), g('orc', 6, 1.8, 5, 1)] },
      { time: 0, groups: [g('ogre', 1, 1, 0, 0), g('ogre', 1, 1, 6, 1), g('goblin', 24, 0.5, 2, 0), g('orc', 6, 2, 10, 1)] },
    ],
  },
  {
    id: 3, name: '얼어붙은 고개', theme: 'snow', startGold: 320, lives: 20,
    paths: [
      { pts: [p(-30, 460), p(180, 460), p(180, 110), p(420, 110), p(420, 340), p(660, 340), p(660, 110), p(990, 110)] },
      { pts: [p(-30, 300), p(990, 440)], air: true },
    ],
    spots: [
      p(100, 330), p(100, 200), p(260, 220), p(270, 60), p(340, 230), p(240, 400), p(350, 400),
      p(540, 280), p(540, 430), p(750, 230), p(580, 60), p(830, 60), p(830, 190), p(720, 280), p(600, 410),
    ],
    waves: [
      { time: 20, groups: [g('goblin', 10, 1.0), g('wisp', 3, 1.5, 4, 1)] },
      { time: 22, groups: [g('wolf', 10, 0.6), g('wisp', 5, 1.2, 3, 1)] },
      { time: 24, groups: [g('orc', 4, 2.4), g('wisp', 6, 1.0, 2, 1)] },
      { time: 26, groups: [g('goblin', 16, 0.5), g('wisp', 8, 0.9, 4, 1), g('orc', 3, 2.5, 9)] },
      { time: 28, groups: [g('wolf', 14, 0.4), g('orc', 5, 2, 4), g('wisp', 8, 0.8, 8, 1)] },
      { time: 30, groups: [g('orc', 8, 1.6), g('wisp', 12, 0.7, 2, 1)] },
      { time: 32, groups: [g('wolf', 16, 0.35), g('wisp', 14, 0.6, 4, 1), g('orc', 6, 1.8, 7)] },
      { time: 0, groups: [g('ogre', 1, 1), g('wisp', 16, 0.6, 3, 1), g('goblin', 24, 0.5, 5), g('orc', 8, 1.8, 12)] },
    ],
  },
];
