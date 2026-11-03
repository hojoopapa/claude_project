import type { LevelDef } from './data/levels';

/** 난이도 배율: 쉬움, 보통, 어려움 */
export const DIFF_MULT = [0.8, 1.0, 1.3] as const;

export interface ScoreBreakdown {
  base: number;       // 클리어 기본 점수
  lives: number;      // 남은 생명 점수
  time: number;       // 빨리 끝낸 시간 보너스
  mult: number;       // 난이도 배율
  total: number;
}

const BASE = 1000, PER_LIFE = 120, PER_SECOND = 6;

/** 기준 시간(초): 웨이브가 자동으로 이어졌을 때의 총 시간 + 여유. 이보다 빨리 끝내면 시간 보너스. */
export function parTime(level: LevelDef): number {
  return level.waves.reduce((a, w) => a + w.time, 0) + 90;
}

/**
 * 점수 = (클리어 1000 + 남은 생명 x120 + 시간 보너스) x 난이도 배율
 * elapsed 는 게임 시계(초)라서 2배속으로 해도 이득이 없고, 웨이브를 일찍 부르면 빨라진다.
 */
export function calcScore(level: LevelDef, livesLeft: number, elapsed: number, diff: 0 | 1 | 2): ScoreBreakdown {
  const lives = Math.max(0, livesLeft) * PER_LIFE;
  const time = Math.max(0, Math.round((parTime(level) - elapsed) * PER_SECOND));
  const mult = DIFF_MULT[diff];
  return { base: BASE, lives, time, mult, total: Math.round((BASE + lives + time) * mult) };
}

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
