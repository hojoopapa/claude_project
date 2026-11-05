# 온라인 랭킹 연결 방법

게임은 점수 계산과 내 기록 저장까지는 서버 없이 동작한다. **친구들과 점수를 비교하는 온라인 랭킹**은 무료 데이터베이스(Firebase Realtime Database) 하나를 연결해야 켜진다. 연결하지 않으면 랭킹 화면에는 내 기록만 보이고 "랭킹에 등록" 버튼은 나타나지 않는다.

## 점수 계산
`점수 = (클리어 1000 + 남은 생명 x120 + 시간 보너스) x 난이도 배율` (`src/score.ts`)

- 시간 보너스 = (기준 시간 - 걸린 시간) x 6. 기준 시간은 웨이브가 자동으로 이어졌을 때의 총 시간 + 90초. 웨이브를 일찍 부르면 빨라져서 보너스가 늘고, 2배속은 영향이 없다 (게임 시계 기준).
- 난이도 배율: 쉬움 x0.8, 보통 x1.0, 어려움 x1.3.
- 스테이지마다 최고 점수만 저장한다. "전체 합계"는 스테이지별 최고 점수의 합.

## Firebase 만들기 (약 5분, 무료)
1. https://console.firebase.google.com 에서 **프로젝트 추가** (Google 애널리틱스는 꺼도 된다).
2. 왼쪽 **빌드 → Realtime Database → 데이터베이스 만들기**. 위치는 가까운 곳, 보안 규칙은 **잠금 모드**로 시작.
3. **규칙** 탭에 아래를 통째로 붙여넣고 **게시**.

```json
{
  "rules": {
    "r": {
      "$room": {
        "scores": {
          "$level": {
            ".read": true,
            ".indexOn": ["score"],
            "$pid": {
              ".write": "$pid != 'dev' || !data.exists()",
              ".validate": "newData.hasChildren(['name','score','diff','t']) && newData.child('name').isString() && newData.child('name').val().length <= 12 && newData.child('score').isNumber() && newData.child('score').val() >= 0 && newData.child('score').val() <= 10000 && newData.child('diff').isNumber()"
            }
          }
        },
        "totals": {
          ".read": true,
          ".indexOn": ["score"],
          "$pid": {
            ".write": "$pid != 'dev' || !data.exists()",
            ".validate": "newData.hasChildren(['name','score','n','t']) && newData.child('name').isString() && newData.child('name').val().length <= 12 && newData.child('score').isNumber() && newData.child('score').val() <= 200000 && newData.child('n').isNumber() && newData.child('n').val() <= 20"
          }
        },
        "names": {
          "$key": {
            ".read": true,
            ".write": "(!data.exists() && newData.exists()) || (!newData.exists() && data.val() != 'dev')",
            ".validate": "newData.isString() && newData.val().length <= 24"
          }
        }
      }
    }
  }
}
```

4. **데이터** 탭 맨 위에 보이는 주소를 복사한다. 예: `https://내프로젝트-default-rtdb.asia-southeast1.firebasedatabase.app`
5. 그 주소를 게임에 넣는다. (이 프로젝트는 `src/config.ts`의 `DEFAULT_RANKING_URL`에 이미 넣어 두었다. 다른 DB로 바꿀 때만 아래를 쓴다.) 둘 중 하나:
   - GitHub 저장소 **Settings → Secrets and variables → Actions → Variables** 탭에서 `RANKING_URL` 변수를 만들고 주소를 넣는다. 그다음 Actions 탭에서 "Deploy to GitHub Pages"를 다시 실행한다.
   - 또는 Claude에게 주소를 알려주면 `src/config.ts`에 넣어 병합한다.

## 이름 중복 방지
- 같은 방(방 코드)에서는 한 이름을 한 명만 쓸 수 있다. 위 규칙의 `names` 항목이 "이름 장부"다: `names/<이름 키> = 그 이름을 쓰는 플레이어 id`이고, **이미 있는 키는 쓰기를 거부**해서 두 명이 동시에 눌러도 한 명만 성공한다.
- 이름 키는 대소문자와 공백을 무시한 이름의 UTF-8 16진수다 (`Wook`, `wook`, `W ook`은 같은 이름).
- 닉네임을 정할 때 바로 확인하고, 이미 쓰는 이름이면 다시 묻는다. 점수를 올릴 때도 한 번 더 확인한다. 이름을 바꾸면 예전 이름은 풀리고, "점수 초기화"를 하면 내 이름도 함께 풀린다.
- 한계: 로그인이 없어서 장부를 직접 지우는 사람까지는 막지 못한다. 브라우저 저장값을 지워 id 가 바뀌면 예전 이름은 그 id 에 묶여 남으므로 다른 이름을 써야 한다. `names` 항목이 규칙에 없으면 이름 확인이 실패해서 랭킹 등록이 되지 않는다.

## 개발자 기록 (삭제 불가)
- 공개 방(`public`)에는 플레이어 id `dev`의 기록이 고정으로 올라가 있다: 스테이지마다 그 스테이지 **만점 - 1점**, 종합은 **전체 만점의 합 - 1점**. 만점은 "어느 난이도로든 생명을 하나도 잃지 않고 걸린 시간 0으로 깼을 때"의 이론상 최댓값이다 (`src/score.ts`의 `perfectScore`, 개발자 점수는 `devStageScore`, `devTotalScore`). 2026-11-05 기준 스테이지 5,597점(1번 5,792점), 종합 112,154점이다.
- 이 기록은 점수 규칙을 바꾸면 값이 어긋난다. 규칙(점수 공식, 스테이지 수, 난이도)을 바꾸면 같은 계산으로 다시 구해서 다시 올려야 한다. 그러려면 아래 보호 규칙을 잠깐 풀어야 한다.
- 규칙의 `$pid != 'dev' || !data.exists()`는 `dev` 기록이 **한 번 만들어진 뒤에는 덮어쓰기와 삭제를 막는다**. 이름 장부의 `data.val() != 'dev'`는 `dev`가 차지한 이름(`개발자`, `Developer`, `開発者`, `开发者`, `Desarrollador`, `Desenvolvedor`, `dev`)을 아무도 가져가지 못하게 한다. 화면에서는 id가 `dev`인 기록의 이름을 보는 사람의 언어로 바꿔 보여준다 (`devName`).
- 규칙이 위처럼 게시되기 전에는 누구나 지울 수 있으므로, 개발자 기록을 올린 뒤 바로 규칙을 게시한다.

## 쓰는 방법
- 스테이지를 클리어하면 결과 화면에 점수와 내역이 나오고 **랭킹에 등록**(처음이면 닉네임 입력) 또는 **결과 복사**(친구에게 메신저로 보내기)를 고를 수 있다.
- 메인 화면이나 스테이지 선택 화면의 **랭킹** 버튼에서 스테이지별 / 전체 합계 순위를 본다.
- **방 코드**: 친구들끼리 같은 방 코드(영문·숫자 1~16자)를 정하면 그 방의 점수만 서로 보인다. 기본 방은 `public`(모두 함께). 랭킹 화면 아래의 방 버튼으로 바꾼다.
- **내 기록 모두 등록**: 랭킹을 켜기 전에 쌓은 기록을 한 번에 올린다.

## 주의
- 점수는 브라우저가 직접 보내는 값이라 개발자 도구로 조작할 수 있고, 규칙에도 로그인이 없어서 같은 방 코드를 아는 사람은 남의 기록을 덮어쓸 수 있다. **친구끼리 가볍게 비교하는 용도**다. 엄격한 경쟁이 필요하면 로그인과 서버 검증이 있는 구조로 바꿔야 한다.
- 규칙의 점수 상한(10000, 합계 200000)은 터무니없는 값을 막는 정도다. 점수 공식을 바꾸면 상한도 함께 조정한다.
- 개발 서버에서는 주소에 `?rankdb=테스트DB주소`를 붙여 다른 DB로 시험할 수 있다 (배포본에서는 무시된다).
