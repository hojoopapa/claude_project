import type { LevelDef } from './data/levels';
import { DIFFICULTIES } from './data/features';

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
  return level.par ?? level.waves.reduce((a, w) => a + w.time, 0) + 90;   // par 가 있으면 그 값 (웨이브 수를 바꿔도 점수 기준이 흔들리지 않게)
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

/** 온라인 랭킹에 고정으로 올려 두는 "개발자" 기록의 플레이어 id. 점수는 만점에서 1점 모자라게 둔다 (삭제 불가, docs/ranking-setup.md) */
export const DEV_ID = 'dev';

/**
 * 만점: 어느 난이도로든 생명을 하나도 잃지 않고 시간 보너스를 최대(걸린 시간 0)로 받았을 때의 점수.
 * 현실에서는 나올 수 없는 이론상 최댓값이다.
 */
export function perfectScore(level: LevelDef): number {
  return Math.max(...([0, 1, 2] as const).map((d) => calcScore(level, level.lives + DIFFICULTIES[d].lives, 0, d).total));
}

/** 개발자의 스테이지 점수: 그 스테이지 만점 - 1 */
export const devStageScore = (level: LevelDef): number => perfectScore(level) - 1;

/** 개발자의 종합 점수: 전체 스테이지 만점의 합 - 1 */
export const devTotalScore = (levels: LevelDef[]): number => levels.reduce((a, lv) => a + perfectScore(lv), 0) - 1;
