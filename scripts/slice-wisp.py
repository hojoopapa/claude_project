"""
도깨비불(e_wisp) 시트(대기 두 벌, 공격 두 벌)를 잘라서 게임용 PNG 3장으로 만든다.

  python scripts/slice-wisp.py [시트.png] [출력폴더]

  e_wisp_idle1.png, e_wisp_idle2.png : 대기 (왼쪽 위, 왼쪽 아래). 날아다니는 동안 번갈아 보여준다
  e_wisp_atk.png                     : 공격 (오른쪽 위). 도깨비불은 때리지 않으므로 맞았을 때 놀라 소리치는 반응으로 쓴다

자홍색 배경과 글자("IDLE", "ATTACK"), 떨어진 불꽃 조각, 속도선은 고블린과 같은 방식으로 지운다 (sprite_tools.py).
대기 그림에는 몸 둘레에 푸른 빛 번짐(글로우)이 있어서 자홍색과 섞여 지저분해지므로 파란 기운이 도는 픽셀은 몸에서 뺀다.
결과는 화면 표시 크기의 2배다 (게임에서 0.5배로 그린다).
"""
import os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sprite_tools import despill, dilate, keyed_alpha, largest_component   # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'docs', 'art', 'source', 'wisp.png')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', 'public', 'skins', 'png')

# (이름, 시트에서의 영역 x0,y0,x1,y1, 푸른 글로우 제거 여부)
FRAMES = [
    ('e_wisp_idle1', (40, 125, 350, 500), True),
    ('e_wisp_idle2', (40, 605, 350, 990), True),
    ('e_wisp_atk', (385, 150, 745, 480), False),
]
BODY_H = 70        # 첫 장(대기) 높이 (2배 해상도 기준, 화면에서는 35px). 나머지는 같은 비율로 줄인다
PAD = 6


def extract(img: Image.Image, box, drop_glow: bool) -> Image.Image:
    cell = np.array(img.crop(box).convert('RGB'))
    a = keyed_alpha(cell)
    if drop_glow:
        r, g, b = [cell[..., i].astype(np.int16) for i in range(3)]
        a = a * ((b - g) <= 22)                               # 글로우는 파랑이 초록보다 강하고, 몸(옥색)은 초록이 더 강하다
    a = a * dilate(largest_component(a > 0.5), 2)
    rgba = np.dstack([despill(cell, a), a * 255.0]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA')
    return im.crop(im.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox())


def main():
    img = Image.open(SRC)
    frames = [(name, extract(img, box, glow)) for name, box, glow in FRAMES]
    scale = BODY_H / frames[0][1].height
    rs = []
    for name, f in frames:
        f = f.resize((max(1, round(f.width * scale)), max(1, round(f.height * scale))), Image.LANCZOS)
        a = np.array(f.getchannel('A')).astype(np.float32)
        cx = float((a.sum(axis=0) * np.arange(f.width)).sum() / a.sum())        # 떠 있는 몸이라 무게중심을 캔버스 가운데에 둔다
        cy = float((a.sum(axis=1) * np.arange(f.height)).sum() / a.sum())
        rs.append((name, f, cx, cy))
    hw = max(max(cx, f.width - cx) for _, f, cx, _ in rs)
    hh = max(max(cy, f.height - cy) for _, f, _, cy in rs)
    cw, ch = int(round(hw * 2)) + PAD * 2, int(round(hh * 2)) + PAD * 2
    os.makedirs(OUT, exist_ok=True)
    for name, f, cx, cy in rs:
        canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        canvas.paste(f, (int(round(cw / 2 - cx)), int(round(ch / 2 - cy))), f)
        canvas.save(os.path.join(OUT, name + '.png'), optimize=True)
        print(f'{name}.png  {cw}x{ch}  (몸 {f.width}x{f.height})')


if __name__ == '__main__':
    main()
