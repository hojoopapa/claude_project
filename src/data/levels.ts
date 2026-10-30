import type { Vec } from '../game/path.ts';
import type { EnemyKind } from './enemies.ts';
import { autoSpots } from './autospots.ts';
import { genWaves, type PoolEntry } from './wavegen.ts';

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

export type Theme = 'meadow' | 'desert' | 'swamp' | 'snow' | 'volcano';

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

interface Spec {
  id: number;
  name: string;
  theme: Theme;
  ground: Vec[][];
  air?: Vec[][];
  /** 직접 지정한 자리, 또는 자동 배치할 개수 */
  spots?: Vec[] | number;
  pool: PoolEntry[];
  boss?: WaveGroup[];
  power?: number;
}

const line = (...pts: [number, number][]) => pts.map(([x, y]) => p(x, y));
const e = (kind: EnemyKind, w: number, from = 0): PoolEntry => ({ kind, w, from });

function make(sp: Spec): LevelDef {
  const paths = [...sp.ground.map((pts) => ({ pts })), ...(sp.air ?? []).map((pts) => ({ pts, air: true }))];
  const spots = Array.isArray(sp.spots) ? sp.spots : autoSpots(sp.ground, sp.spots ?? 14);
  const waves = genWaves({
    seed: sp.id, stage: sp.id, pool: sp.pool, lanes: sp.ground.length,
    airPath: sp.air?.length ? sp.ground.length : undefined, boss: sp.boss, power: sp.power,
  });
  return { id: sp.id, name: sp.name, theme: sp.theme, paths, spots, waves, startGold: Math.min(480, 260 + 12 * (sp.id - 1)), lives: 20 };
}

const AIR = (n: number) => n; // 공중 경로 번호 표기용 (지상 경로 수와 같다)

export const LEVELS: LevelDef[] = [
  {
    id: 1, name: 'Meadow Gate', theme: 'meadow', startGold: 260, lives: 20,
    paths: [{ pts: line([-30, 130], [220, 130], [220, 400], [480, 400], [480, 160], [740, 160], [740, 420], [990, 420]) }],
    spots: [
      p(100, 200), p(100, 60), p(290, 250), p(150, 300), p(350, 330), p(350, 470),
      p(410, 250), p(550, 280), p(610, 230), p(610, 90), p(680, 300), p(810, 300), p(850, 350), p(850, 490),
    ],
    // 튜토리얼 스테이지: 1단계 타워만 쓸 수 있어서 방어구가 높은 적은 적게 나온다.
    waves: [
      { time: 24, groups: [g('goblin', 8, 1.2)] },
      { time: 24, groups: [g('goblin', 10, 1.0), g('wolf', 3, 0.9, 6)] },
      { time: 26, groups: [g('goblin', 8, 0.9), g('orc', 1, 3, 5)] },
      { time: 26, groups: [g('wolf', 8, 0.6), g('goblin', 8, 0.8, 7)] },
      { time: 28, groups: [g('goblin', 12, 0.7), g('orc', 2, 2.5, 6)] },
      { time: 28, groups: [g('wolf', 6, 0.6), g('orc', 2, 2.5, 3), g('goblin', 8, 0.7, 8)] },
      { time: 30, groups: [g('orc', 4, 2.2), g('wolf', 8, 0.6, 5)] },
      { time: 0, groups: [g('goblin', 14, 0.7), g('orc', 2, 2.8, 6), g('wolf', 5, 0.6, 12)] },
    ],
  },
  // ---- 초원 ----
  make({
    id: 2, name: 'Winding Fields', theme: 'meadow',
    ground: [line([-30, 100], [700, 100], [700, 250], [160, 250], [160, 400], [990, 400])],
    pool: [e('goblin', 3), e('wolf', 2, 1), e('orc', 1.2, 4)],
  }),
  make({
    id: 3, name: 'Pincer Attack', theme: 'meadow',
    ground: [
      line([-30, 110], [420, 110], [420, 330], [990, 330]),
      line([990, 440], [560, 440], [560, 330], [990, 330]),
    ],
    pool: [e('goblin', 3), e('wolf', 2), e('orc', 1.5, 3)],
  }),
  make({
    id: 4, name: 'Snail Hill', theme: 'meadow',
    ground: [line([-30, 70], [880, 70], [880, 430], [80, 430], [80, 180], [680, 180], [680, 300], [300, 300])],
    pool: [e('goblin', 2), e('wolf', 2), e('orc', 1.5, 2), e('bat', 1.5, 3)],
  }),
  // ---- 사막 ----
  make({
    id: 5, name: 'Desert Crossroads', theme: 'desert',
    ground: [
      line([-30, 100], [300, 100], [300, 270], [560, 270], [560, 380], [990, 380]),
      line([-30, 470], [300, 470], [300, 270], [560, 270], [560, 380], [990, 380]),
    ],
    spots: [
      p(210, 160), p(210, 40), p(380, 200), p(210, 400), p(110, 410), p(400, 350), p(450, 200),
      p(660, 320), p(660, 440), p(800, 320), p(800, 440), p(500, 330),
    ],
    pool: [e('goblin', 2), e('wolf', 2), e('orc', 2), e('bat', 1.5, 2)],
  }),
  make({
    id: 6, name: 'Twin Oasis', theme: 'desert',
    power: 0.5,
    ground: [
      line([-30, 130], [300, 130], [300, 200], [650, 200], [650, 130], [990, 130]),
      line([-30, 410], [300, 410], [300, 340], [650, 340], [650, 410], [990, 410]),
    ],
    pool: [e('wolf', 2), e('orc', 2), e('bat', 2), e('wisp', 1.5, 2)],
  }),
  make({
    id: 7, name: 'Red Canyon', theme: 'desert',
    ground: [line([-30, 420], [160, 420], [160, 90], [380, 90], [380, 420], [600, 420], [600, 90], [820, 90], [820, 420], [990, 420])],
    pool: [e('goblin', 2), e('orc', 2), e('wraith', 1.5, 2), e('wisp', 1, 3)],
  }),
  make({
    id: 8, name: 'Sandstorm Fork', theme: 'desert',
    power: 0.9,
    ground: [
      line([-30, 270], [250, 270], [250, 130], [700, 130], [700, 270], [990, 270]),
      line([-30, 270], [250, 270], [250, 410], [700, 410], [700, 270], [990, 270]),
    ],
    pool: [e('goblin', 2), e('wolf', 1.5), e('orc', 2), e('shaman', 1.2, 3), e('bat', 1)],
  }),
  // ---- 늪 ----
  make({
    id: 9, name: 'Misty Marsh', theme: 'swamp',
    power: 0.85,
    ground: [
      line([-30, 120], [400, 120], [400, 420], [990, 420]),
      line([990, 120], [560, 120], [560, 420], [-30, 420]),
    ],
    pool: [e('wolf', 2), e('orc', 2), e('wraith', 2, 2), e('shaman', 1, 3)],
  }),
  make({
    id: 10, name: 'Swamp Titan', theme: 'swamp',
    ground: [line([-30, 270], [230, 270], [230, 100], [480, 100], [480, 430], [730, 430], [730, 200], [990, 200])],
    pool: [e('goblin', 2), e('orc', 2), e('wraith', 1.5), e('golem', 1, 4)],
    boss: [g('ogre', 1, 1, 2), g('golem', 2, 5, 6)],
  }),
  make({
    id: 11, name: 'Toadstool Woods', theme: 'swamp',
    ground: [line([-30, 90], [740, 90], [740, 200], [220, 200], [220, 310], [740, 310], [740, 430], [990, 430])],
    pool: [e('goblin', 2), e('orc', 2), e('shaman', 2, 1), e('wraith', 1.5, 3)],
  }),
  make({
    id: 12, name: 'Rotten Lake', theme: 'swamp',
    power: 0.5,
    ground: [line([-30, 440], [200, 440], [200, 100], [480, 100], [480, 330], [760, 330], [760, 100], [990, 100])],
    air: [line([-30, 100], [990, 440])],
    pool: [e('wolf', 2), e('orc', 2), e('bat', 2), e('wisp', 2), e('golem', 1, 5)],
  }),
  // ---- 설원 ----
  make({
    id: 13, name: 'Frozen Pass', theme: 'snow',
    power: 0.55,
    ground: [line([-30, 460], [180, 460], [180, 110], [420, 110], [420, 340], [660, 340], [660, 110], [990, 110])],
    air: [line([-30, 300], [990, 440])],
    spots: [
      p(100, 330), p(100, 200), p(260, 220), p(270, 60), p(340, 230), p(240, 400), p(350, 400),
      p(540, 280), p(540, 430), p(750, 230), p(580, 60), p(830, 60), p(830, 190), p(720, 280), p(600, 410),
    ],
    pool: [e('goblin', 2), e('wolf', 2), e('wisp', 2), e('orc', 2), e('bat', 1.5, 2)],
  }),
  make({
    id: 14, name: 'Ice Crossing', theme: 'snow',
    power: 0.75,
    ground: [line([-30, 80], [960, 440]), line([-30, 440], [960, 80])],
    pool: [e('wolf', 2), e('orc', 2), e('wraith', 2), e('shaman', 1, 2), e('golem', 1, 4)],
  }),
  make({
    id: 15, name: 'Frost River Lord', theme: 'snow',
    power: 0.7,
    ground: [
      line([-30, 150], [300, 150], [300, 270], [660, 270], [660, 150], [990, 150]),
      line([-30, 390], [300, 390], [300, 270], [660, 270], [660, 390], [990, 390]),
    ],
    pool: [e('orc', 2), e('wraith', 2), e('shaman', 1.5), e('golem', 1.5, 3), e('bat', 1)],
    boss: [g('ogre', 1, 1, 2, 0), g('ogre', 1, 1, 8, 1), g('shaman', 3, 2, 4, 0)],
  }),
  make({
    id: 16, name: 'Blizzard Ridge', theme: 'snow',
    power: 0.85,
    ground: [line([-30, 450], [120, 450], [120, 90], [300, 90], [300, 380], [480, 380], [480, 90], [660, 90], [660, 380], [840, 380], [840, 150], [990, 150])],
    pool: [e('goblin', 2), e('wolf', 2), e('orc', 2), e('golem', 1.5, 3), e('wisp', 2), e('wraith', 1.5)],
  }),
  // ---- 화산 ----
  make({
    id: 17, name: 'Magma Fork', theme: 'volcano',
    power: 0.7,
    ground: [
      line([-30, 270], [200, 270], [200, 90], [990, 90]),
      line([-30, 270], [990, 270]),
      line([-30, 270], [200, 270], [200, 450], [990, 450]),
    ],
    pool: [e('wolf', 2), e('orc', 2), e('wraith', 2), e('shaman', 1.5, 2), e('golem', 1.5, 3), e('bat', 2)],
  }),
  make({
    id: 18, name: 'Ember Valley', theme: 'volcano',
    power: 0.5,
    ground: [line([-30, 90], [300, 90], [300, 300], [100, 300], [100, 430], [520, 430], [520, 200], [700, 200], [700, 430], [990, 430])],
    air: [line([-30, 270], [990, 100])],
    pool: [e('orc', 2), e('wraith', 2), e('golem', 2), e('wisp', 2), e('bat', 2), e('shaman', 1.5, 2)],
  }),
  make({
    id: 19, name: 'Ashen Gauntlet', theme: 'volcano',
    power: 0.55,
    ground: [
      line([-30, 120], [350, 120], [350, 200], [990, 200]),
      line([-30, 420], [350, 420], [350, 340], [990, 340]),
    ],
    air: [line([-30, 270], [990, 270])],
    pool: [e('wolf', 2), e('wraith', 2), e('bat', 3), e('wisp', 2), e('golem', 1.5, 2), e('orc', 2)],
  }),
  make({
    id: 20, name: "Dragon's Maw", theme: 'volcano',
    power: 0.62,
    ground: [
      line([-30, 90], [420, 90], [420, 270], [990, 270]),
      line([-30, 450], [420, 450], [420, 270], [990, 270]),
    ],
    air: [line([-30, 60], [990, 270])],
    pool: [e('wolf', 2), e('orc', 2), e('wraith', 2), e('shaman', 1.5), e('golem', 1.5, 2), e('bat', 2), e('wisp', 2)],
    boss: [g('drake', 1, 1, 3, AIR(2)), g('ogre', 2, 4, 8, 0), g('golem', 2, 5, 12, 1)],
  }),
];
