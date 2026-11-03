# 그래픽

게임 그래픽은 **SVG 벡터 그림**만 쓴다 (이미지 생성 AI 버전은 제거했다).

- `scripts/gen-svg-skin.cjs`: SVG 50개 생성기. 타워 6종 x 3단계(18), 적 10종, 영웅 2명, 병사, 건설 자리, 투사체 3개, 테마별 소품 15개. 그림을 고치려면 이 파일을 수정하고 `npm run gen:svg`.
- `public/skins/svg/`: 생성 결과와 `index.json` (게임이 이 목록을 읽어 불러온다).
- `docs/art/manifest.json`: 에셋 key와 크기(표시 크기의 2배). 새 그림을 추가하면 여기에도 넣는다.
- 기본 스타일은 부드러운 명암의 단순 스타일이다. 그라데이션 없이 자세한 예전 그림이 필요하면 `DETAIL=1 node scripts/gen-svg-skin.cjs`.
- 모든 스프라이트는 오른쪽을 본다 (왼쪽으로 갈 때는 코드에서 좌우 반전).
- 맵 장식 개수는 `GameScene.ts`의 `MAX_PROPS`, 움직임은 `src/game/entities.ts`.
