# Realm Guard (왕국 수호대)

Kingdom Rush 스타일의 웹 타워 디펜스. 서버 없이 정적 파일만으로 동작한다.

- 스택: TypeScript + Phaser 3 + Vite
- 아트: 코드로 그린 SVG 벡터 그림 (`scripts/gen-svg-skin.cjs`로 생성), 걷기·공격 같은 간단한 애니메이션
- 저장: `localStorage` (스테이지별 별 개수, 난이도, 튜토리얼 확인 여부)
- 광고 없음

## 실행

```bash
npm install
npm run dev            # 개발 서버
npm run build          # dist/ 생성 (정적 호스팅에 그대로 업로드)
npm run gen:svg        # SVG 그림 다시 생성
npm run check-levels   # 타워 자리/경로 검증, 예상 플레이 시간 출력
```

## 구조

- `src/data/levels.ts` — 스테이지 데이터(경로, 타워 자리, 웨이브). 새 스테이지는 여기에 추가 (최대 20개)
- `src/data/towers.ts`, `enemies.ts` — 능력치 테이블
- `src/game/entities.ts` — Enemy / Soldier / Hero / Tower / Projectile (움직임 연출 포함)
- `src/scenes/` — Boot, Menu, LevelSelect, Game
