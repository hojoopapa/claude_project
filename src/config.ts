export const GAME_W = 960;
export const GAME_H = 540;
export const FONT = "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Hiragino Sans', 'Microsoft YaHei', system-ui, sans-serif";

/**
 * 온라인 랭킹 데이터베이스 주소 (Firebase Realtime Database REST). 비어 있으면 온라인 랭킹은 꺼지고 내 기록만 쓴다.
 * 만드는 방법은 docs/ranking-setup.md 를 본다. 예: 'https://my-game-default-rtdb.firebaseio.com'
 */
export const RANKING_URL: string = import.meta.env.VITE_RANKING_URL ?? '';
