export const GAME_W = 960;
export const GAME_H = 540;
export const FONT = "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', 'Hiragino Sans', 'Microsoft YaHei', system-ui, sans-serif";

/**
 * 온라인 랭킹 데이터베이스 주소 (Firebase Realtime Database REST). 비어 있으면 온라인 랭킹은 꺼지고 내 기록만 쓴다.
 * 만드는 방법은 docs/ranking-setup.md 를 본다. 이 주소는 브라우저가 어차피 직접 부르는 공개 값이라 비밀이 아니다.
 * 저장소 Variables 의 RANKING_URL(빌드 때 VITE_RANKING_URL)이 있으면 그 값을 먼저 쓴다.
 * 변수가 비어 있으면 배포 설정이 빈 문자열을 넘기므로 ?? 가 아니라 || 로 기본값을 고른다.
 */
const DEFAULT_RANKING_URL = 'https://realtime-database-c4fff-default-rtdb.asia-southeast1.firebasedatabase.app';
export const RANKING_URL: string = import.meta.env.VITE_RANKING_URL || DEFAULT_RANKING_URL;
