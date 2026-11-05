# Realm Guard (왕국 수호대) — 작업 가이드

Kingdom Rush 스타일 웹 타워 디펜스. 서버 없는 정적 웹게임이고 광고(보상형 + 배너)로 수익을 낸다. 사용자는 한국어 사용자이며, 응답은 한국어로 한다.

## 확정된 결정
- 서버 없음. 정적 호스팅(Cloudflare Pages 등)에 `dist/`를 올린다. 진행 상황은 `localStorage`.
- 스택: TypeScript + Phaser 3 + Vite.
- 아트: **SVG 벡터 그래픽만** 쓴다 (이미지 생성 AI 버전은 제거했다). 그림은 `scripts/gen-svg-skin.cjs`가 만들고 `public/skins/svg`에 있다. 그림이 없는 키는 `BootScene`의 도형 텍스처로 폴백한다. Kingdom Rush의 캐릭터·에셋은 저작권상 그대로 쓰지 않는다. **예외: 고블린만 PNG 프레임 애니메이션**(걷기 2장, 공격 2장, `public/skins/png`)을 쓴다 (2026-11-05 사용자 결정, 이미지 생성 AI로 만든 그림). 원본 시트는 `docs/art/source/goblin_1.png`, `python scripts/slice-goblin-frames.py`로 자르고(자홍색 배경, 글자, 효과선 제거) 다시 만든다. 걸을 때 두 장을 0.22초마다 번갈아 보여주고, 막혀서 싸울 때는 공격1(준비)과 공격2(찌르기, 때리는 순간)를 쓴다 (`Enemy.pickFrame`, 정의는 `enemies.ts`의 `frames`). 다른 적을 같은 방식으로 늘리려면 `skin.ts`의 `PNG_FRAMES`와 `frames`에 추가한다. **궁수탑 1~3레벨도 PNG**(`public/skins/png/t_archer_1~3.png`, 2026-11-05 사용자 결정)를 쓴다: 원본 `docs/art/source/archer_123.png`(2x2 시트에서 왼쪽 위=LV1, 오른쪽 위=LV2, 왼쪽 아래=LV3만 사용), `python scripts/slice-archer-tower.py`로 다시 만든다. 같은 키의 SVG는 불러오지 않는다(`skin.ts`의 `PNG_TOWERS`, `BootScene`). 탑 바닥이 이미지 높이의 90% 지점에 와야 타워 기준점(origin y 0.9)과 맞는다. 세 장은 같은 비율로 줄여서 LV3가 더 크다(화면에서 약 112px, 기존 SVG는 80px). 자홍색 배경 제거 같은 공용 처리는 `scripts/sprite_tools.py`.
- 스테이지는 최대 20개, 스테이지당 3~5분 이내 클리어, 템포는 다이나믹하게.
- **광고는 세 곳에만 쓴다** (2026-11-04 결정): ① 배속 2X/3X 해제 ② 패배 직전 "광고 보고 이어하기" ③ 스테이지 사이 전면 광고 자리. 영웅·타워 잠금과 하단 배너는 쓰지 않는다. 광고 호출은 `src/ads.ts`의 `AdProvider` 인터페이스(`show` 보상형, `interstitial` 전면) 하나로 모았다. 지금은 **테스트용 모의 구현**이라 보상형은 카운트다운 창만 보여주고, 전면 광고는 아무것도 하지 않는다(공개 테스트 빌드를 가짜 광고로 방해하지 않기 위해). 포털(CrazyGames, Poki 등)에 올릴 때 `ads` 를 그 SDK 구현으로 바꿔 끼운다.
- **이어하기**: 생명이 0이 되면 안내창이 뜨고, 보상형 광고를 끝까지 보면 최대 생명의 50%로 이어간다 (스테이지당 1번, `GameScene`의 `REVIVE_PER_STAGE`, `REVIVE_LIVES_RATIO`). 안내창은 실제 화면 루프(`update`)에서만 띄운다 — 밸런스 시뮬레이션은 `step`을 직접 불러서 영향받지 않는다.
- **전면 광고 자리**: 결과 화면에서 다음 스테이지/다시 하기/스테이지 선택으로 넘어가기 직전에 `ads.interstitial()`을 거친다 (`GameScene.afterAd`). 노출 빈도는 공급자(포털 SDK)가 정한다.
- **모바일**: 모든 버튼은 모양과 무관하게 최소 44x44 터치 영역을 갖는다 (`ui.ts`의 `MIN_TOUCH`). 상단 버튼은 52x42로 키웠다. 폰을 세로로 들면 "가로로 돌려 주세요" 안내가 뜬다 (`index.html`, 눌러서 닫을 수 있음). 터치 하이라이트·길게 누르기 선택은 막아 두었다. 사운드는 iOS를 위해 `touchend`/`click`에서도 깨운다. 주의: 데스크톱 크롬은 Phaser 터치 입력이 꺼져 있어(`input.touch` 없음) 터치 경로는 실제 기기에서만 확인할 수 있다. 타워 건설 메뉴의 설명(툴팁)은 마우스는 올리면 보이고, 터치는 첫 탭에서 설명을 보여주고 같은 버튼을 한 번 더 탭하면 건설한다 (`GameScene.menuButton`의 `armedTip`; 설명창이 없는 타워 메뉴는 한 번에 실행).
- 다국어: ko, en, ja, zh, es, pt. 문자열은 전부 `src/i18n.ts`에서 관리한다 (UI에 한국어를 직접 쓰지 말 것).

## 현재 상태
- 스테이지 20개(초원 1~4 / 사막 5~8 / 늪 9~12 / 설원 13~16 / 화산 17~20), 웨이브 각 8개. 보스 스테이지: 10(골렘+오우거), 15(오우거 2), 20(비룡+오우거+골렘).
- 타워 6종: 궁수, 마법, 대포, 병영, 냉기, 번개. 각 3단계 업그레이드. 냉기·번개탑은 5번 스테이지부터 열린다.
- 적 10종: 고블린, 늑대, 오크, 도깨비불(공중), 박쥐(공중), 망령(마법 저항), 주술사(주변 회복), 바위 골렘(고방어), 오우거(보스), 화염 비룡(공중 보스).
- 영웅 2명(5번 스테이지부터, 시작할 때 자동 등장): 기사 알드릭(근접, 강타), 마법사 리라(원거리, 빙결).
- 스펠 2종(화염비, 지원군), 조기 호출 보너스, 일시정지.
- **배속 2X/3X**: 3X는 예전의 빠른 속도(진행 배율 2.0), 2X는 그 중간(1.5). 값은 `features.ts`의 `SPEEDS`. 2X는 짧은 광고(모의 5초), 3X는 긴 광고(모의 15초)를 끝까지 보면 **그 스테이지 동안** 쓸 수 있다 (재시작·다음 스테이지에서는 다시 광고). **스테이지 1~3번은 보통 속도만** 가능하고 버튼을 누르면 안내만 뜬다 (`NORMAL_SPEED_STAGES`). 모의 광고 시간은 주소에 `?adsec=3`을 붙이면 줄어든다.
- **튜토리얼 구간(스테이지 1~4)**: 기능을 하나씩 연다 (`src/data/features.ts`의 `featuresFor`). 1번은 기본 타워 4종의 1단계만(업그레이드 없음, 스펠 없음), 2번은 2단계까지 강화, 3번은 지원군 추가, 4번은 화염비 추가. **5번부터** 3단계 강화, 영웅, 냉기·번개탑이 모두 열린다. 1~4번에서 새 기능을 처음 쓰면 게임이 멈추고 설명창이 뜬다 (건설, 강화, 지원군, 화염비, 웨이브 호출; 본 기록은 localStorage, 주소에 `?tutorial=always`를 붙이면 매번 표시).
- - **난이도 3단계**(스테이지 선택 화면 오른쪽 위 버튼, localStorage 저장): 쉬움(적 체력 x0.91, 시작 골드 x1.25, 생명 25), 보통(적 체력 x1.1, 생명 20), 어려움(적 체력 x1.38, 시작 골드 x0.9, 생명 15). 값은 `features.ts`의 `DIFFICULTIES`. 2026-11-05에 세 난이도의 적 체력을 모두 +10% 올렸다(쉬움은 벽 추가 때 이미 0.75→0.825로 올렸었다). 별 기록은 난이도와 상관없이 공유한다.
- **점수와 랭킹**: 클리어하면 `src/score.ts`의 공식으로 점수를 계산한다 `(1000 + 남은 생명 x120 + 시간 보너스) x 난이도 배율(0.8/1/1.3)`. 스테이지별 최고 점수는 localStorage(`save.ts`)에 저장하고, 결과 화면(`GameScene.finish`)에 내역을 보여준다. 랭킹 화면은 `RankingScene`(스테이지별/전체 합계, 닉네임, 친구끼리 쓰는 방 코드), 통신은 `src/ranking.ts`(Firebase Realtime Database REST). 주소(`RANKING_URL` 저장소 변수 → `VITE_RANKING_URL`)가 비어 있으면 온라인 랭킹은 꺼지고 내 기록만 보인다. 연결 방법과 규칙은 `docs/ranking-setup.md`. 점수는 클라이언트가 보내는 값이라 친구끼리 비교하는 용도다. 개발 중에는 `?rankdb=`로 테스트 DB를 지정한다. 글자 입력은 `domDialog.ts`(HTML 입력창).
- **움직임**: 적과 병사·영웅은 걸을 때 통통 튀고 기울며(`walkPose`), 박쥐·비룡은 날갯짓, 도깨비불·망령은 둥실거린다. 공격하면 앞으로 내밀고, 맞으면 순간 부풀고, 죽으면 줄어들며 사라진다. 발밑에 그림자가 있고 타워는 지을 때와 공격할 때 튄다. 코드는 `src/game/entities.ts`, 적별 움직임 종류는 `enemies.ts`의 `anim`. 시뮬레이션처럼 프레임 없이 `step()`만 부르면 트윈이 안 돌아서, 죽은 유닛의 `update`는 바로 빠져나오게 해 두었다.

- **벽**: 하단의 벽 버튼을 누르고 길 위를 누르면 지상 적을 막는 벽을 세운다 (`GameScene.pickWall/placeWall`, `entities.ts`의 `Wall`, 값은 `src/data/walls.ts`). 업그레이드 없음. 재질은 스테이지 구간별로 나무(1~5, 25골드/체력80) → 흙(6~10, 35/170) → 벽돌(11~15, 50/320) → 금속(16~20, 70/560). 적이 닿으면 멈춰서 벽을 공격하고, 공중 적은 못 막는다. 동시에 3개까지, 벽끼리 36 이상 떨어져야 한다. 병사는 벽에 막힌 적에게도 붙을 수 있다 (`Soldier`의 대상 선택은 다른 *병사*가 맡은 적만 건너뛴다).
- **보스 용(20번)의 파괴 공격**: 날아가는 동안 발밑(`stomp` 38)의 타워, 병사, 영웅, 벽을 모두 부수고(타워는 환불 없이 빈 터로), 6.5초마다 사거리 320 안의 가장 가까운 타워(없으면 병사/벽)를 골라 1.1초 예고(붉은 원과 "화염 브레스!") 후 반경 85에 브레스를 쏜다. 값은 `enemies.ts`의 `drake.breath`, 구현은 `GameScene.bossTick/smashAt/startBreath/fireBlast`. 용이 살아서 끝까지 가면 생명 10이 깎인다. 5개 타워만 있는 시뮬레이션에서는 4번의 브레스로 타워 5개가 모두 부서졌다 — 너무 가혹하면 `every`를 늘리거나 `radius`를 줄인다.
- **보스 등장 연출**: 보스(오우거, 용)가 들어 있는 웨이브(10, 15, 20번의 마지막 웨이브)가 시작되면 `GameScene.bossIntro`가 웅장한 소리(`sound.ts`의 `boss`), 화면 흔들림, 붉은 어둠, 스산한 바람 줄기, "보스 출현!" 배너를 보여주고 보스 등장을 `BOSS_INTRO`(4초) 늦춘다.
- **이름 중복 방지(온라인 랭킹)**: 방 코드마다 이름 장부 `r/<방>/names/<이름 키>=플레이어 id`를 둔다 (`ranking.ts`의 `claimName/releaseName/nameKey`, 입력창은 `nameDialog.ts`의 `askUniqueName`). 규칙이 이미 있는 키의 쓰기를 거부해서 한 이름은 한 명만 쓴다. 대소문자와 공백은 같은 이름으로 본다. 점수를 올리기 전에도 확인하고(`submitScore`), 점수 초기화나 이름 변경 때 풀어 준다. Firebase 규칙에 `names` 항목이 있어야 하며(`docs/ranking-setup.md`), 없으면 랭킹 등록이 실패한다. 로그인이 없어 장부를 직접 지우는 사람은 못 막는다.
- **개발자 고정 기록(온라인 랭킹)**: 공개 방(`public`)에 플레이어 id `dev`의 기록이 올라가 있다 — 스테이지마다 만점 - 1(1번 5,792, 나머지 5,597), 종합 112,154(= 전체 만점 합 - 1). 만점은 `score.ts`의 `perfectScore`(어느 난이도로든 생명을 잃지 않고 걸린 시간 0)이고 개발자 점수는 `devStageScore/devTotalScore`다. 화면에서는 id 가 `dev`면 이름을 보는 사람의 언어로 보여준다(`devName`). 이름 장부에 `개발자`, `Developer`, `開発者`, `开发者`, `Desarrollador`, `Desenvolvedor`, `dev`가 `dev`로 선점돼 있다. **삭제 방지는 Firebase 규칙**(`docs/ranking-setup.md`의 `$pid != 'dev' || !data.exists()`, 이름 장부의 `data.val() != 'dev'`)이 게시돼야 효력이 있다. 점수 공식, 스테이지 수, 난이도를 바꾸면 값이 어긋나므로 다시 계산해서 올려야 한다(규칙을 잠깐 풀어야 함). 다른 방 코드(친구 방)에는 올리지 않았다.
- **시작 화면 그림**(2026-11-05 사용자 결정): 메인 화면(`MenuScene`)은 시안 이미지를 배경으로 쓴다. 시안(`D:\AI_Works\image\start.png`, 2752x1536)에는 제목, 게임 시작/랭킹 버튼, 소리/언어 버튼이 그림 속에 박혀 있어서(6개 언어와 터치를 위해) `python scripts/prepare-start-art.py`로 그 부분을 주변 색으로 지워 `public/skins/png/start_bg.jpg`(1920x1072)를 만들고, 제목과 버튼은 게임이 직접 그린다(제목은 금색 글자+갈색 테두리, 긴 제목은 폭 660에 맞춰 줄임). 시안 오른쪽 아래의 생성 도구 별 워터마크는 반투명 덧씌움을 거꾸로 풀어 지웠다(`remove_sparkle`, 용 꼬리 윤곽선에 걸려 있어 주변 색 채우기는 쓸 수 없었다). 시안 원본은 `docs/art/source/start.jpg`(JPEG q95 사본)이다. 시안을 바꾸면 스크립트의 `REGIONS`, `DRAGON_BOX`, `remove_sparkle` 좌표를 다시 확인한다. 같은 시안에서 뽑아 쓰는 것: **용**(`taunt_dragon.png`, 약올림 팝업과 20번 보스 용 — `enemies.ts`의 `drake.sprite`, 왼쪽을 보는 그림이라 `facesLeft`로 뒤집어 쓰고 브레스는 `Enemy.mouth()`에서 나간다), **기사**(`h_knight.png`, 영웅 기사 알드릭 — SVG 대신 쓰므로 `skin.ts`의 `PNG_REPLACE`), **불꽃**(`breath_flame.png`, 용의 브레스가 터질 때 `GameScene.fireBlast`가 쓴다). 기사는 뒤의 성벽, 마법탑과 겹쳐 있어서 윤곽선으로 둘러싸인 칸 중 `KNIGHT_POLY` 안에 든 칸만 골라 오렸다. 성, 마법탑, 큰 고블린 2마리는 겹치거나(기사에 가림) 그림 아래쪽이 잘려 있어서 깨끗하게 뽑을 수 없었다 (필요하면 따로 그린 그림이 필요하다). 작은 고블린은 뽑을 수 있지만 쓸 곳이 없다.
- **스테이지 시작 약올림 인트로**: 스테이지(1~20번)를 시작할 때마다 전투 화면 위에 팝업(`TauntScene`, `GameScene.create`가 `scene.launch`)이 **5초 카운트다운**(5, 4, 3, 2, 1초 뒤 시작)으로 뜬다. 붉은 용이 날아와 비웃으며 "난 이 정도 수준인데... 넌 어떻게... 따라올 수 있겠어? 크크크"와 그 스테이지의 **개발자 기록**(`devStageScore`)을 말풍선으로 보여준다. 팝업이 떠 있는 동안 전투는 멈추고(`GameScene.update`가 `scene.isActive('Taunt')`를 본다), 화면을 눌러도 건너뛰지 않는다. **"광고 보고 인트로 없애기"**(`ads.show(..., 'intro')`)를 끝까지 보면 그 실행 동안 팝업이 안 뜬다 — 값은 저장하지 않으므로(`introRemoved`) 앱을 새로 실행하면 다시 나온다. 광고를 보는 동안에는 카운트다운이 멈추고, 취소하면 이어진다. 다시 하기, 다음 스테이지에서도 매번 뜬다. 길이는 `SHOW_SECONDS`. 웃음소리는 `sound.ts`의 `taunt`.
- **내 점수 초기화**: 랭킹 화면 오른쪽 위 버튼. 확인창 후 이 기기의 최고 점수를 지우고(별은 유지), 온라인 랭킹이 켜져 있으면 현재 방 코드의 내 기록도 지운다 (`save.ts resetScores`, `ranking.ts clearMine`). 온라인 삭제는 Firebase 규칙이 쓰기를 허용해야 하고 실제 DB로는 아직 시험하지 못했다.
- **스테이지 중 초기화면 나가기**: 전투 화면 상단의 집 모양 버튼 → 확인창("진행 중인 스테이지는 저장되지 않아요") → 메뉴로. 확인창은 `ui.ts`의 `confirmModal`을 쓴다.
- **병영 집결지점**: 병영을 누르면 뜨는 메뉴의 깃발 버튼으로 병사 3명이 모일 곳을 지정한다 (`GameScene.pickRally/placeRally`, `Tower.setRally`). 타워에서 `Tower.RALLY_MAX`(150) 안으로 보정되고, 살아 있는 병사는 바로 새 자리로 이동하며 새로 나오는 병사도 그 자리에 선다. 병영 메뉴를 열면 사거리 대신 이 범위 원과 현재 깃발이 보인다.
- **효과음**: `src/sound.ts`가 Web Audio로 합성한다 (소리 파일 없음, 배경음 없음). 켜기/끄기는 `soundButton`(전투 화면 위쪽, 메뉴 화면)으로 하고 설정은 localStorage `realmguard.sound`에 저장한다. 소리를 추가하려면 `Sfx` 이름과 `GAP`(최소 간격), `play()`의 case를 함께 넣는다. 브라우저 정책상 첫 클릭 전에는 소리가 나지 않는다.

## 명령어
```bash
npm install
npm run dev            # 개발 서버
npm run build          # tsc 검사 + dist/ 생성
npm run build:single   # dist/single.html (단일 파일 미리보기용)
npm run gen:svg        # SVG 스킨 다시 생성 (scripts/gen-svg-skin.cjs)
npm run check-levels   # 타워 자리/경로 검증, 스테이지별 총 HP/골드/예상 시간
node scripts/balance-sim.cjs . 1,5,20 [0|1|2]   # 봇 시뮬레이션, 마지막 인자는 난이도 (dev 서버 --port 5199 필요, playwright 필요)
```

## 구조
- `src/ui.ts` — UI 키트. 팔레트(`C`), 외곽선 없는 `text()`, 둥근 `panel()`, 쿨다운/선택 상태가 있는 `button()`(컨테이너 기반, 아이콘 지원), 등장 애니메이션이 있는 `modal()`. 새 UI를 만들 때는 이걸 쓴다. 주의: Phaser 컨테이너의 히트 영역은 **좌상단 기준 좌표**다 (원형이면 `Circle(R, R, R)`). 아이콘 텍스처(`ic_*`)는 `BootScene.makeIcons()`가 48x48로 그리고 0.5배로 표시한다.
- `src/skin.ts` — SVG 그림 로드와 텍스처 키 선택. SVG는 표시 크기의 2배로 만들어 0.5배로 그린다 (`texFor(키, 레벨)`이 키와 배율을 돌려준다. 새로 이미지를 그리는 코드는 `add.image`에 키를 직접 쓰지 말고 `texFor`를 쓴다).
- `scripts/gen-svg-skin.cjs` — SVG 50개 생성기 (그림을 고치려면 여기를 수정하고 `npm run gen:svg`). 기본은 부드러운 명암의 단순 스타일이고 `DETAIL=1`이면 자세한 버전. 크기는 `docs/art/manifest.json`을 따른다.
- `src/data/levels.ts` — 스테이지 정의. 1번만 손으로 쓴 웨이브이고, 나머지는 `make()`로 경로(직접 설계)만 주면 타워 자리(`autospots.ts`)와 웨이브(`wavegen.ts`)를 자동 생성한다. 스테이지별 난이도는 `power` 배율로 조정. 새 스테이지 이름은 `i18n.ts`의 `level.N`에 넣는다.
- `src/data/wavegen.ts` — 웨이브 생성기. 난이도 곡선 상수는 맨 위의 `BASE0`, `BASE_STEP`, `WAVE_GROWTH`.
- `src/data/autospots.ts` — 경로 옆에서 사거리 커버가 큰 타워 자리를 자동 선택.
- `src/data/towers.ts`, `enemies.ts`, `heroes.ts` — 능력치 테이블. 밸런스는 여기서 조정.
- `src/data/features.ts` — 스테이지별 해금 기능과 난이도 배율. 새 기능을 추가하면 `featuresFor`와 필요한 설명창(`i18n.ts`의 `tut.<키>.title/body`)을 함께 넣는다.
- `src/game/entities.ts` — Enemy / Soldier / Hero / Tower / Projectile.
- `src/scenes/GameScene.ts` — 전투 루프, UI, 건설 메뉴, 광고 흐름.
- `src/i18n.ts` — 번역. 새 언어는 `LANGS`와 각 키의 배열 끝에 추가.

## 작업 규칙
- 변경 후 `npx tsc --noEmit`로 타입 검사를 한다. 스테이지를 건드리면 `npm run check-levels`도 돌린다.
- Phaser `Scene`에는 `scene` 속성이 이미 있어서, 엔티티가 보는 World 인터페이스는 `gs`라는 이름을 쓴다.
- 게임 로직은 시간 배율(배속)을 위해 `update`의 `dt`에 `speed`를 곱해서 진행한다. Phaser 타이머/트윈은 시각 효과에만 쓴다.

## 작업 흐름
- 기본 브랜치는 `main`. 새 작업은 별도 브랜치에서 하고 PR로 병합한다 (지금까지는 squash 병합). 푸시하지 않은 변경은 다른 PC에서 보이지 않는다.
- 플레이용 미리보기는 `npm run build:single`로 만든 `dist/single.html`을 claude.ai 아티팩트로 올려서 확인했다 (본인만 열리는 비공개 링크).

## 배포
- `main`에 푸시되면 `.github/workflows/deploy.yml`이 GitHub Pages에 자동 배포한다 (공개 주소: https://hojoopapa.github.io/claude_project/). 저장소 Settings → Pages → Source가 "GitHub Actions"여야 한다. 검색엔진 색인은 막아 둔다(`noindex`).

## 다음 작업
1. (완료 2026-11-05) 랭킹 DB(Firebase Realtime Database, 프로젝트 realtime-database-c4fff)를 연결했다. 주소는 `src/config.ts`의 `DEFAULT_RANKING_URL`이고 규칙은 `docs/ranking-setup.md`와 같다. 로그인 없는 구조라 친구끼리 가볍게 비교하는 용도다.
2. 20개 스테이지를 사람이 플레이해 보고 `power` 조정. 광고 제거와 영웅 자동 등장으로 5번 이후가 이전보다 쉬워졌다 (봇 시뮬레이션: 보통 난이도에서 12, 18, 20번만 패배). 필요하면 후반 `power`를 올린다.
3. 실제 폰에서 터치·화면 확인 (버튼 크기와 건설 메뉴 설명은 보강함).
4. 포털에 올릴 때 모의 광고(`src/ads.ts`)를 실제 광고 SDK로 교체.
