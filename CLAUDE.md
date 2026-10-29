# Realm Guard (왕국 수호대) — 작업 가이드

Kingdom Rush 스타일 웹 타워 디펜스. 서버 없는 정적 웹게임이고 광고(보상형 + 배너)로 수익을 낸다. 사용자는 한국어 사용자이며, 응답은 한국어로 한다.

## 확정된 결정
- 서버 없음. 정적 호스팅(Cloudflare Pages 등)에 `dist/`를 올린다. 진행 상황은 `localStorage`.
- 스택: TypeScript + Phaser 3 + Vite.
- 아트: 외부 에셋 없이 `src/scenes/BootScene.ts`에서 도형으로 텍스처 생성. 게임성이 검증되면 에셋 교체. Kingdom Rush의 캐릭터·에셋은 저작권상 그대로 쓰지 않는다.
- 스테이지는 최대 20개, 스테이지당 3~5분 이내 클리어, 템포는 다이나믹하게.
- 광고: 보상형 중심 + 하단 배너. 영웅과 일부 타워는 "광고 시청 → 해당 스테이지 동안 해제" 방식.
- 다국어: ko, en, ja, zh, es, pt. 문자열은 전부 `src/i18n.ts`에서 관리한다 (UI에 한국어를 직접 쓰지 말 것).
- 광고 플랫폼 1순위는 CrazyGames, 2순위는 Poki. 포털 SDK로 교체할 때는 `src/ads.ts`의 `AdProvider`만 구현한다. 수익 분배율은 비공식 자료라 가입 전 약관 확인이 필요하다.

## 현재 상태
- 스테이지 3개(초원 / 사막 / 설원), 웨이브 각 8개.
- 타워 6종: 궁수, 마법, 대포, 병영, 냉기(광고 해제), 번개(광고 해제). 각 3단계 업그레이드.
- 적 5종: 고블린, 늑대, 오크, 도깨비불(공중), 오우거(보스).
- 영웅 2명(광고 해제): 기사 알드릭(근접, 강타), 마법사 리라(원거리, 빙결).
- 스펠 2종(화염비, 지원군), 조기 호출 보너스, 2배속, 일시정지.
- 광고는 테스트용 모의 구현(MockAds, 기본 30초, `?adsec=3`으로 단축).

## 명령어
```bash
npm install
npm run dev            # 개발 서버
npm run build          # tsc 검사 + dist/ 생성
npm run build:single   # dist/single.html (단일 파일 미리보기용)
npm run check-levels   # 타워 자리/경로 검증과 예상 플레이 시간
```

## 구조
- `src/data/levels.ts` — 스테이지(경로, 타워 자리, 웨이브). 새 스테이지는 여기에 추가한 뒤 `i18n.ts`에 `level.N` 이름을 넣는다.
- `src/data/towers.ts`, `enemies.ts`, `heroes.ts` — 능력치 테이블. 밸런스는 여기서 조정.
- `src/game/entities.ts` — Enemy / Soldier / Hero / Tower / Projectile.
- `src/scenes/GameScene.ts` — 전투 루프, UI, 건설 메뉴, 광고 흐름.
- `src/i18n.ts` — 번역. 새 언어는 `LANGS`와 각 키의 배열 끝에 추가.
- `src/ads.ts` — 광고 제공자 추상화.

## 작업 규칙
- 변경 후 `npx tsc --noEmit`로 타입 검사를 한다. 스테이지를 건드리면 `npm run check-levels`도 돌린다.
- Phaser `Scene`에는 `scene` 속성이 이미 있어서, 엔티티가 보는 World 인터페이스는 `gs`라는 이름을 쓴다.
- 게임 로직은 시간 배율(2배속)을 위해 `update`의 `dt`에 `speed`를 곱해서 진행한다. Phaser 타이머/트윈은 시각 효과에만 쓴다.

## 다음 후보 작업
1. 플레이 테스트 후 난이도·영웅 성능·광고 해제 빈도 조정.
2. CrazyGames SDK 연동(`ads.ts` 교체, 일시정지/음소거 규격).
3. 스테이지 20개까지 확장 (전반부에 신규 적·지형을 점진적으로 도입).
4. 에셋 교체(스프라이트, 사운드), 모바일 터치 점검.
