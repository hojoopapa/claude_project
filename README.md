# Realm Guard (왕국 수호대)

Kingdom Rush 스타일의 웹 타워 디펜스. 서버 없이 정적 파일만으로 동작한다.

- 스택: TypeScript + Phaser 3 + Vite
- 아트: 외부 에셋 없이 `BootScene`에서 도형으로 텍스처 생성
- 저장: `localStorage` (스테이지별 별 개수)
- 광고: `src/ads.ts`의 `AdProvider` 인터페이스 뒤에 숨김. 지금은 3초짜리 테스트 광고(MockAds)

## 실행

```bash
npm install
npm run dev            # 개발 서버
npm run build          # dist/ 생성 (정적 호스팅에 그대로 업로드)
npm run check-levels   # 타워 자리/경로 검증, 예상 플레이 시간 출력
```

## 구조

- `src/data/levels.ts` — 스테이지 데이터(경로, 타워 자리, 웨이브). 새 스테이지는 여기에 추가 (최대 20개)
- `src/data/towers.ts`, `enemies.ts` — 능력치 테이블
- `src/game/entities.ts` — Enemy / Soldier / Tower / Projectile
- `src/scenes/` — Boot, Menu, LevelSelect, Game
