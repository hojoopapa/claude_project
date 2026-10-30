# ChatGPT 그래픽 프롬프트 모음

Realm Guard의 그래픽을 ChatGPT(이미지 생성)로 만들 때 쓰는 프롬프트다. 사용 순서와 파일 이름 규칙은 `docs/art/README.md`를 먼저 본다.
이 프롬프트는 ChatGPT, Gemini 등 어떤 이미지 생성 서비스에도 그대로 쓴다 (Gemini 팁은 `docs/art/README.md` 맨 아래). 이 문서는 `docs/art/manifest.json`과 같은 내용에서 만들었다. 에셋을 추가하거나 바꿀 때는 두 파일을 함께 고친다.

## 0. 스타일 가이드 (대화 맨 처음에 한 번 붙여넣기)

```text
Please create a consistent set of game images. Remember this style for every image I ask for in this chat:
2D game asset for a fantasy tower-defense web game. Hand-painted cartoon style, bold dark-brown outlines, soft cel shading with the light coming from the top-left, saturated slightly warm colors, chunky readable silhouette, slightly exaggerated proportions, 3/4 top-down camera (looking down about 35 degrees). One single object, centered, fully visible with a margin on every side, no text, no watermark, no frame, no ground shadow. Background: perfectly flat solid magenta #FF00FF with no gradient, no floor and no props. Never use magenta or hot pink inside the subject. Original design; do not imitate the characters of any existing game.
```

- 같은 종류끼리는 **같은 대화창**에서 만든다 (타워 대화, 적 대화, 영웅 대화, 타일 대화). 스타일이 훨씬 일정하게 나온다.
- 첫 이미지가 마음에 들면 그 이미지를 **첨부**하고 `Use this image as the style reference.`를 덧붙여서 나머지를 만든다.
- 배경은 반드시 **단색 마젠타(#FF00FF)** 로 요청한다. 투명 PNG를 요청하면 가짜 체크무늬가 그려지는 경우가 많아서, 배경 제거는 제가 스크립트로 한다.
- 마젠타가 피사체에 섞이지 않게 보라색은 푸른 보라(violet), 분홍은 피한다.
- 한 이미지에 한 개체만 만든다. 정사각형(1024x1024)으로 생성해도 되고, 제가 자동으로 잘라서 크기를 맞춘다.

각 프롬프트 앞에는 아래 한 줄을 붙인다 (스타일 가이드를 이미 보냈어도 안전하게):

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background.
```

우선순위: **P1** = 게임의 기본 모습이 바뀌는 핵심 (먼저), **P2** = 업그레이드 단계/배경, **P3** = 선택(효과/투사체).


### 0-1. 단순한 스타일 (그림이 복잡해 보일 때 권장)
처음 만든 스타일은 질감과 디테일이 많아서 작은 크기에서 복잡해 보일 수 있다. 더 단순한 그림이 필요하면 위 스타일 가이드 대신 아래를 **새 대화**에 붙여넣고, 에셋별 프롬프트는 그대로 쓴다. 같은 파일 이름으로 다시 올리면 기존 이미지를 덮어쓴다.

```text
Please create a consistent set of game images in a SIMPLE, FLAT style. Remember this style for every image I ask for in this chat:
2D game asset for a casual fantasy tower-defense web game. Very simple flat-color vector illustration, like a mobile game icon: big bold shapes, thick dark-brown outlines, only 2 to 3 flat colors per material with at most one simple shadow tone, NO textures (no brick lines, no fur, no fabric folds, no scratches, no gradients, no glow effects, no particles), minimal details, a large readable silhouette that is still clear when shrunk to 60 pixels, cute slightly chunky proportions, 3/4 top-down camera. One single object, centered, fully visible with a margin on every side, nothing floating around it, no text, no watermark, no frame, no ground shadow. Background: perfectly flat solid magenta #FF00FF with no gradient, no floor and no props. Never use magenta or hot pink inside the subject. Original design; do not imitate the characters of any existing game.
```

- 결과가 아직 복잡하면 이렇게 덧붙인다: "Even simpler: remove all small details, use fewer colors, bigger shapes."
- 단순하게 다시 만들 때 우선순위: 자주 보이는 것부터 (적 `e_goblin` `e_wolf` `e_orc` `e_bat` → 영웅·병사 → 타워 레벨 1 → 나머지).

## 타워와 건설 자리

타워는 레벨 1로 먼저 스타일을 확정한 뒤, 레벨 2와 3은 **레벨 1 이미지를 첨부**하고 `Make the upgraded version of this exact tower.`를 덧붙인다.

### `t_archer_1`  (P1, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A archer tower, level 1 of 3. A small wooden-and-stone watchtower with a pointed green shingle roof, a tiny archer with a bow standing on the top platform, one banner. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_archer_2`  (P2, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A archer tower, level 2 of 3. The SAME archer tower, upgraded: taller stone base with wooden balcony, two archers, a green banner, small metal reinforcements. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_archer_3`  (P2, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A archer tower, level 3 of 3. The SAME archer tower, fully upgraded: tall fortified stone tower with golden trim, three archers, a large green-and-gold flag, spikes on the balcony. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_mage_1`  (P1, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A mage tower, level 1 of 3. A slender stone tower with a purple-blue conical roof and a glowing cyan crystal orb floating above the top. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_mage_2`  (P2, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A mage tower, level 2 of 3. The SAME mage tower, upgraded: two floating cyan crystals, glowing runes carved into the stone, a small second roof ring. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_mage_3`  (P2, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A mage tower, level 3 of 3. The SAME mage tower, fully upgraded: grand arcane spire with rotating golden rings, three bright crystals, swirling cyan energy. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_cannon_1`  (P1, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A cannon tower, level 1 of 3. A squat round stone bastion with a dark iron cannon pointing up-right on top and a few cannonballs stacked at the base. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_cannon_2`  (P2, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A cannon tower, level 2 of 3. The SAME cannon tower, upgraded: thicker walls with iron bands, a bigger bronze-and-iron cannon, a second small cannon. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_cannon_3`  (P2, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A cannon tower, level 3 of 3. The SAME cannon tower, fully upgraded: heavy fortress bastion with gold trim, a huge long-barrel cannon, spiked parapet. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_barracks_1`  (P1, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A barracks, level 1 of 3. A wide timber-and-stone hall with a red tiled roof, a blue banner on a pole, a wooden door with two torches. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_barracks_2`  (P2, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A barracks, level 2 of 3. The SAME barracks, upgraded: larger hall with a second small tower, two blue banners, a weapon rack beside the door. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_barracks_3`  (P2, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A barracks, level 3 of 3. The SAME barracks, fully upgraded: a small castle keep with two towers, big blue-and-gold banners, a stone gate. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_frost_1`  (P1, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A frost tower, level 1 of 3. A tower of pale blue-grey stacked stone topped with a large ice crystal, frost on the roof, a faint cold mist at the base. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_frost_2`  (P2, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A frost tower, level 2 of 3. The SAME frost tower, upgraded: several ice crystals growing from the sides, thicker frost, glowing icy-blue core. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_frost_3`  (P2, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A frost tower, level 3 of 3. The SAME frost tower, fully upgraded: towering ice spire made of crystals with a bright white-blue glow, snow swirling around. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_thunder_1`  (P1, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A thunder tower, level 1 of 3. A dark iron-and-stone tower with a copper coil and a yellow glowing sphere on top, a small lightning spark. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_thunder_2`  (P2, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A thunder tower, level 2 of 3. The SAME thunder tower, upgraded: two copper coils, brighter sphere, visible blue-yellow lightning arcs between the coils. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `t_thunder_3`  (P2, 최종 128x160px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A thunder tower, level 3 of 3. The SAME thunder tower, fully upgraded: tall tesla spire with three coils, a blazing yellow sphere and big lightning arcs. Show the tower as a building seen from the front-top (3/4 view), standing on a small stone foundation. Canvas: portrait, tower fills about 80% of the height.
```

### `spot`  (P1, 최종 112x66px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. An empty tower build plot: a flat round stone platform with a few cobbles and a tiny tuft of grass, seen from above at 3/4 view, wide and low (about 1.7:1 ratio).
```

## 적

적은 모두 **오른쪽을 보도록** 요청한다 (왼쪽으로 가는 경우는 제가 좌우 반전한다). 크기 비율을 맞추려고 `goblin`을 가장 작게, `ogre`와 `drake`를 가장 크게 그려 달라고 해도 된다 (최종 크기는 제가 맞춘다).

### `e_goblin`  (P1, 최종 64x64px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Enemy unit: a small green goblin with big pointy ears, a ragged brown tunic and a small rusty dagger, grinning, walking pose. The creature FACES RIGHT. Full body visible.
```

### `e_wolf`  (P1, 최종 88x64px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Enemy unit: a lean grey wolf with red glowing eyes, running pose with open mouth, low body, side view. The creature FACES RIGHT. Full body visible.
```

### `e_orc`  (P1, 최종 88x88px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Enemy unit: a stocky dark-green orc with tusks, wearing a heavy iron chest plate and shoulder guards, holding a crude axe, walking pose. The creature FACES RIGHT. Full body visible.
```

### `e_wisp`  (P1, 최종 64x64px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Enemy unit: a floating blue will-o-the-wisp: a glowing pale-cyan flame spirit with a tiny angry face, soft glow, no legs. The creature FACES RIGHT. Full body visible.
```

### `e_bat`  (P1, 최종 80x56px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Enemy unit: a purple cave bat with big spread wings, red eyes and small fangs, flying pose, side view. The creature FACES RIGHT. Full body visible.
```

### `e_wraith`  (P1, 최종 76x88px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Enemy unit: a ghostly teal wraith in a tattered hooded robe with a fading wispy tail instead of legs, hollow dark eyes, semi-transparent look but with a solid outline. The creature FACES RIGHT. Full body visible.
```

### `e_shaman`  (P1, 최종 84x96px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Enemy unit: a goblin-orc shaman in a dark red hooded robe holding a wooden staff with a glowing green gem, bone necklace, walking pose. The creature FACES RIGHT. Full body visible.
```

### `e_golem`  (P1, 최종 120x120px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Enemy unit: a big rock golem made of grey boulders with glowing orange cracks and orange eyes, mossy shoulders, heavy slow walking pose. The creature FACES RIGHT. Full body visible.
```

### `e_ogre`  (P1, 최종 140x140px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Enemy unit: a huge brown ogre warlord with a spiked iron crown, a bone-armor belt, one big spiked club, angry face, boss-sized, walking pose. The creature FACES RIGHT. Full body visible.
```

### `e_drake`  (P1, 최종 200x150px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Enemy unit: a red fire drake dragon with wide spread bat-like wings, glowing yellow eyes, small flames from the mouth, flying pose, boss-sized, side view. The creature FACES RIGHT. Full body visible.
```

## 영웅과 병사

### `h_knight`  (P1, 최종 80x92px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Hero 'Sir Aldric': a brave human knight in polished steel armor with gold trim, a red cape, a plumed helmet, a sword and a round blue shield, confident pose. FACES RIGHT. Full body.
```

### `h_sorc`  (P1, 최종 80x96px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Hero 'Lyra the Sorceress': a young sorceress in a violet robe with a tall pointed hat, long white hair, holding a staff topped with a glowing cyan orb, casting pose. FACES RIGHT. Full body.
```

### `soldier`  (P1, 최종 52x60px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A small blue-armored footman soldier with a steel helmet, short sword and a small round shield. FACES RIGHT. Full body. Smaller and plainer than the hero knight.
```

## 배경 타일 (마젠타 배경 없음)

### `g_meadow`  (P2, 최종 512x512px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Seamless tileable ground texture, TOP-DOWN view (not 3/4): lush green meadow grass with tiny clover and flowers. Full-bleed square image with NO magenta background, no border, no large unique landmarks so it tiles without visible repetition. Soft painted style, low contrast so game units stay readable.
```

### `r_meadow`  (P2, 최종 512x512px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Seamless tileable road texture, TOP-DOWN view: packed light-brown dirt road with small pebbles. Full-bleed square image with NO magenta background, horizontally tileable, no large unique landmarks. Soft painted style, medium contrast.
```

### `g_desert`  (P2, 최종 512x512px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Seamless tileable ground texture, TOP-DOWN view (not 3/4): warm sand with subtle dune ripples and tiny pebbles. Full-bleed square image with NO magenta background, no border, no large unique landmarks so it tiles without visible repetition. Soft painted style, low contrast so game units stay readable.
```

### `r_desert`  (P2, 최종 512x512px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Seamless tileable road texture, TOP-DOWN view: darker compacted red-brown sandstone trail with cracks. Full-bleed square image with NO magenta background, horizontally tileable, no large unique landmarks. Soft painted style, medium contrast.
```

### `g_swamp`  (P2, 최종 512x512px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Seamless tileable ground texture, TOP-DOWN view (not 3/4): dark olive swamp ground with moss and shallow muddy puddles. Full-bleed square image with NO magenta background, no border, no large unique landmarks so it tiles without visible repetition. Soft painted style, low contrast so game units stay readable.
```

### `r_swamp`  (P2, 최종 512x512px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Seamless tileable road texture, TOP-DOWN view: wet brown mud path with scattered wooden planks. Full-bleed square image with NO magenta background, horizontally tileable, no large unique landmarks. Soft painted style, medium contrast.
```

### `g_snow`  (P2, 최종 512x512px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Seamless tileable ground texture, TOP-DOWN view (not 3/4): fresh white-blue snow with faint wind ripples and sparkles. Full-bleed square image with NO magenta background, no border, no large unique landmarks so it tiles without visible repetition. Soft painted style, low contrast so game units stay readable.
```

### `r_snow`  (P2, 최종 512x512px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Seamless tileable road texture, TOP-DOWN view: grey-blue packed ice and slush path with small stones. Full-bleed square image with NO magenta background, horizontally tileable, no large unique landmarks. Soft painted style, medium contrast.
```

### `g_volcano`  (P2, 최종 512x512px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Seamless tileable ground texture, TOP-DOWN view (not 3/4): dark charcoal volcanic rock ground with faint glowing orange cracks. Full-bleed square image with NO magenta background, no border, no large unique landmarks so it tiles without visible repetition. Soft painted style, low contrast so game units stay readable.
```

### `r_volcano`  (P2, 최종 512x512px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Seamless tileable road texture, TOP-DOWN view: grey ash road with cooled lava stones. Full-bleed square image with NO magenta background, horizontally tileable, no large unique landmarks. Soft painted style, medium contrast.
```

## 배경 소품 (나무, 바위 등)

### `d_meadow_tree`  (P2, 최종 112x128px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Scenery prop for the meadow area: a round leafy oak tree with a brown trunk. Single object, base resting on the ground, 3/4 view. Canvas: portrait.
```

### `d_meadow_bush`  (P2, 최종 112x128px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Scenery prop for the meadow area: a small green bush with a few red berries. Single object, base resting on the ground, 3/4 view. Canvas: portrait.
```

### `d_meadow_rock`  (P2, 최종 112x128px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Scenery prop for the meadow area: a mossy grey boulder. Single object, base resting on the ground, 3/4 view. Canvas: portrait.
```

### `d_desert_palm`  (P2, 최종 112x128px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Scenery prop for the desert area: a desert palm tree. Single object, base resting on the ground, 3/4 view. Canvas: portrait.
```

### `d_desert_cactus`  (P2, 최종 112x128px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Scenery prop for the desert area: a green saguaro-style cactus with a small flower. Single object, base resting on the ground, 3/4 view. Canvas: portrait.
```

### `d_desert_rock`  (P2, 최종 112x128px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Scenery prop for the desert area: a sandstone rock formation. Single object, base resting on the ground, 3/4 view. Canvas: portrait.
```

### `d_swamp_tree`  (P2, 최종 112x128px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Scenery prop for the swamp area: a twisted dead swamp tree with hanging moss. Single object, base resting on the ground, 3/4 view. Canvas: portrait.
```

### `d_swamp_mushroom`  (P2, 최종 112x128px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Scenery prop for the swamp area: a cluster of big spotted toadstool mushrooms. Single object, base resting on the ground, 3/4 view. Canvas: portrait.
```

### `d_swamp_reeds`  (P2, 최종 112x128px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Scenery prop for the swamp area: a clump of reeds and cattails. Single object, base resting on the ground, 3/4 view. Canvas: portrait.
```

### `d_snow_pine`  (P2, 최종 112x128px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Scenery prop for the snow area: a snow-covered pine tree. Single object, base resting on the ground, 3/4 view. Canvas: portrait.
```

### `d_snow_rock`  (P2, 최종 112x128px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Scenery prop for the snow area: a snowy grey rock. Single object, base resting on the ground, 3/4 view. Canvas: portrait.
```

### `d_snow_crystal`  (P2, 최종 112x128px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Scenery prop for the snow area: a cluster of blue ice crystals. Single object, base resting on the ground, 3/4 view. Canvas: portrait.
```

### `d_volcano_tree`  (P2, 최종 112x128px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Scenery prop for the volcano area: a burnt black dead tree with glowing embers. Single object, base resting on the ground, 3/4 view. Canvas: portrait.
```

### `d_volcano_rock`  (P2, 최종 112x128px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Scenery prop for the volcano area: a dark lava rock with orange cracks. Single object, base resting on the ground, 3/4 view. Canvas: portrait.
```

### `d_volcano_spike`  (P2, 최종 112x128px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. Scenery prop for the volcano area: a sharp obsidian spike cluster. Single object, base resting on the ground, 3/4 view. Canvas: portrait.
```

## 투사체 (선택)

### `p_arrow`  (P3, 최종 48x16px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A single wooden arrow with a steel head and white feathers, pointing RIGHT, horizontal, small.
```

### `p_orb`  (P3, 최종 40x40px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A glowing magic orb: bright white core with soft purple glow, round, no outline needed, simple.
```

### `p_ball`  (P3, 최종 40x40px)

```text
Same art style as the previous images in this chat. Flat solid magenta #FF00FF background. A single black iron cannonball with a small highlight, round, simple.
```
