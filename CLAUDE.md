# Realm Guard (왕국 수호대) — 작업 가이드

Kingdom Rush 스타일 웹 타워 디펜스. 서버 없는 정적 웹게임이고 광고(보상형 + 배너)로 수익을 낸다. 사용자는 한국어 사용자이며, 응답은 한국어로 한다.

## 확정된 결정
- 서버 없음. 정적 호스팅(Cloudflare Pages 등)에 `dist/`를 올린다. 진행 상황은 `localStorage`.
- 스택: TypeScript + Phaser 3 + Vite.
- 아트: **스킨 두 가지**(게임성 동일, 그림만 다름). `svg`(기본, Claude가 코드로 그린 벡터, `public/skins/svg`)와 `image`(Gemini/ChatGPT 등이 만든 PNG, `public/skins/image`). 선택은 메인 화면 버튼 / `?skin=` / localStorage. image 스킨에 없는 그림은 svg로, 거기도 없으면 `BootScene`의 도형 텍스처로 폴백한다. Kingdom Rush의 캐릭터·에셋은 저작권상 그대로 쓰지 않는다.
- 스테이지는 최대 20개, 스테이지당 3~5분 이내 클리어, 템포는 다이나믹하게.
- 광고: 보상형 중심 + 하단 배너. 영웅과 일부 타워는 "광고 시청 → 해당 스테이지 동안 해제" 방식.
- 다국어: ko, en, ja, zh, es, pt. 문자열은 전부 `src/i18n.ts`에서 관리한다 (UI에 한국어를 직접 쓰지 말 것).
- 광고 플랫폼 1순위는 CrazyGames, 2순위는 Poki. 포털 SDK로 교체할 때는 `src/ads.ts`의 `AdProvider`만 구현한다. 수익 분배율은 비공식 자료라 가입 전 약관 확인이 필요하다.

## 현재 상태
- 스테이지 20개(초원 1~4 / 사막 5~8 / 늪 9~12 / 설원 13~16 / 화산 17~20), 웨이브 각 8개. 보스 스테이지: 10(골렘+오우거), 15(오우거 2), 20(비룡+오우거+골렘).
- 타워 6종: 궁수, 마법, 대포, 병영, 냉기(광고 해제), 번개(광고 해제). 각 3단계 업그레이드.
- 적 10종: 고블린, 늑대, 오크, 도깨비불(공중), 박쥐(공중), 망령(마법 저항), 주술사(주변 회복), 바위 골렘(고방어), 오우거(보스), 화염 비룡(공중 보스).
- 영웅 2명(광고 해제): 기사 알드릭(근접, 강타), 마법사 리라(원거리, 빙결).
- 스펠 2종(화염비, 지원군), 조기 호출 보너스, 2배속, 일시정지.
- **튜토리얼 구간(스테이지 1~4)**: 기능을 하나씩 연다 (`src/data/features.ts`의 `featuresFor`). 1번은 기본 타워 4종의 1단계만(업그레이드 없음, 스펠 없음), 2번은 2단계까지 강화, 3번은 지원군 추가, 4번은 화염비 추가. **5번부터** 3단계 강화, 영웅, 광고 보고 골드, 냉기·번개탑(광고 해제)이 모두 열린다. 1~4번에서 새 기능을 처음 쓰면 게임이 멈추고 설명창이 뜬다 (건설, 강화, 지원군, 화염비, 웨이브 호출; 본 기록은 localStorage, 주소에 `?tutorial=always`를 붙이면 매번 표시).
- **난이도 3단계**(스테이지 선택 화면 오른쪽 위 버튼, localStorage 저장): 쉬움(적 체력 x0.75, 시작 골드 x1.25, 생명 25), 보통(기준, 생명 20), 어려움(적 체력 x1.25, 시작 골드 x0.9, 생명 15). 값은 `features.ts`의 `DIFFICULTIES`. 별 기록은 난이도와 상관없이 공유한다.
- 광고는 테스트용 모의 구현(MockAds, 기본 30초, `?adsec=3`으로 단축).

## 명령어
```bash
npm install
npm run dev            # 개발 서버
npm run build          # tsc 검사 + dist/ 생성
npm run build:single   # dist/single.html (단일 파일 미리보기용)
npm run gen:svg        # SVG 스킨 다시 생성 (scripts/gen-svg-skin.cjs)
npm run assets         # assets-inbox 원본 → public/skins/image 변환
npm run check-levels   # 타워 자리/경로 검증, 스테이지별 총 HP/골드/예상 시간
node scripts/balance-sim.cjs . 1,5,20 [0|1|2]   # 봇 시뮬레이션, 마지막 인자는 난이도 (dev 서버 --port 5199 필요, playwright 필요)
```

## 구조
- `src/skin.ts` — 스킨 선택·로드·폴백. 스킨 텍스처는 표시 크기의 2배로 만들어 0.5배로 그린다 (`texFor(키, 레벨)`이 키와 배율을 돌려준다. 새로 이미지를 그리는 코드는 `add.image`에 키를 직접 쓰지 말고 `texFor`를 쓴다).
- `scripts/gen-svg-skin.cjs` — SVG 50개 생성기 (그림을 고치려면 여기를 수정하고 `npm run gen:svg`). 크기는 `docs/art/manifest.json`을 따른다.
- `src/data/levels.ts` — 스테이지 정의. 1번만 손으로 쓴 웨이브이고, 나머지는 `make()`로 경로(직접 설계)만 주면 타워 자리(`autospots.ts`)와 웨이브(`wavegen.ts`)를 자동 생성한다. 스테이지별 난이도는 `power` 배율로 조정. 새 스테이지 이름은 `i18n.ts`의 `level.N`에 넣는다.
- `src/data/wavegen.ts` — 웨이브 생성기. 난이도 곡선 상수는 맨 위의 `BASE0`, `BASE_STEP`, `WAVE_GROWTH`.
- `src/data/autospots.ts` — 경로 옆에서 사거리 커버가 큰 타워 자리를 자동 선택.
- `src/data/towers.ts`, `enemies.ts`, `heroes.ts` — 능력치 테이블. 밸런스는 여기서 조정.
- `src/data/features.ts` — 스테이지별 해금 기능과 난이도 배율. 새 기능을 추가하면 `featuresFor`와 필요한 설명창(`i18n.ts`의 `tut.<키>.title/body`)을 함께 넣는다.
- `src/game/entities.ts` — Enemy / Soldier / Hero / Tower / Projectile.
- `src/scenes/GameScene.ts` — 전투 루프, UI, 건설 메뉴, 광고 흐름.
- `src/i18n.ts` — 번역. 새 언어는 `LANGS`와 각 키의 배열 끝에 추가.
- `src/ads.ts` — 광고 제공자 추상화.

## 작업 규칙
- 변경 후 `npx tsc --noEmit`로 타입 검사를 한다. 스테이지를 건드리면 `npm run check-levels`도 돌린다.
- Phaser `Scene`에는 `scene` 속성이 이미 있어서, 엔티티가 보는 World 인터페이스는 `gs`라는 이름을 쓴다.
- 게임 로직은 시간 배율(2배속)을 위해 `update`의 `dt`에 `speed`를 곱해서 진행한다. Phaser 타이머/트윈은 시각 효과에만 쓴다.

## 작업 흐름
- 기본 브랜치는 `main`. 새 작업은 별도 브랜치에서 하고 PR로 병합한다 (지금까지는 squash 병합). 푸시하지 않은 변경은 다른 PC에서 보이지 않는다.
- 플레이용 미리보기는 `npm run build:single`로 만든 `dist/single.html`을 claude.ai 아티팩트로 올려서 확인했다 (본인만 열리는 비공개 링크).

## 배포
- `main`에 푸시되면 `.github/workflows/deploy.yml`이 GitHub Pages에 자동 배포한다 (공개 주소: https://hojoopapa.github.io/claude_project/). 저장소 Settings → Pages → Source가 "GitHub Actions"여야 한다. 공개 빌드는 테스트 광고를 5초(`VITE_AD_SECONDS`)로 줄이고 검색엔진 색인을 막는다(`noindex`). 실제 광고 SDK를 붙일 때 이 설정도 정리한다.

## 다음 작업 (2026-10-29 기준, 사용자 결정 순서)
1. **그래픽**: SVG 스킨은 완성(타일 제외). **이미지 스킨은 P1 20개 적용 완료** (Gemini 이미지: 타워 6종 레벨 1, 적 10종, 영웅 2명, 병사, 건설 자리). 남은 것: P2(타워 레벨 2·3 12개, 배경 타일 10개, 소품 15개)와 P3(투사체 3개). 이미지가 없는 항목은 SVG로, 타워 상위 레벨은 레벨 1 이미지로 대신 그린다(스타일이 섞이지 않게). 새 이미지는 `assets-inbox/`에 올리고 `npm run assets`로 변환한다 (프롬프트 `docs/art/prompts.md`, 순서 `docs/art/README.md`). 변환 스크립트에는 Gemini 이미지용 처리가 들어 있다: 오른쪽 아래 워터마크 제거, 마젠타 번짐 제거, 도깨비불·망령의 보라색 보정(`COOL`), 병사·기사 이미지의 떠 있는 효과 조각 제거(`ERASE`, 원본 좌표). 아직 게임에서 쓰지 않는 것: 배경 타일 `g_*`/`r_*` (맵 바닥·길은 코드로 그린다). 적·영웅은 오른쪽을 보는 이미지다.
2. 광고는 그다음에 넣는다 (CrazyGames SDK 연동: `ads.ts` 교체, 일시정지/음소거 규격).
3. 20개 스테이지를 사람이 플레이해 보고 `power` 조정 (현재는 봇 시뮬레이션만으로 맞춘 값이다. 봇은 영웅/냉기·번개탑을 쓰지 않는다).
4. 모바일 터치 점검, 사운드 추가.
