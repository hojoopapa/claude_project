"""
늑대(e_wolf) 시트(달리기 두 장, 좌우로 나란히)를 잘라서 게임용 PNG 2장으로 만든다.

  python scripts/slice-wolf.py [시트.png] [출력폴더]

  e_wolf_run1.png, e_wolf_run2.png : 달리기 두 장. 걸을 때 번갈아 보여주고, 막혀서 싸울 때도 같은 두 장을 쓴다 (공격 그림이 따로 없다)

자홍색 배경과 바닥 그림자, 먼지 구름, 속도선은 고블린과 같은 방식으로 지운다 (sprite_tools.py: 가장 큰 덩어리만 남긴다).
먼지 구름이 발에 붙어 있으면 같이 남을 수 있어서 결과를 눈으로 확인한다. 결과는 화면 표시 크기의 2배다 (게임에서 0.5배로 그린다).
"""
import os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sprite_tools import despill, dilate, keyed_alpha, largest_component   # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'docs', 'art', 'source', 'wolf.png')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', 'public', 'skins', 'png')
NAMES = ['e_wolf_run1', 'e_wolf_run2']      # 왼쪽, 오른쪽
BODY_H = 50        # 달리기1 의 몸 높이(2배 해상도 기준). 화면에서는 25px 높이, 폭은 약 41px (병사 26x30 과 비슷한 덩치)
PAD = 6


def cut(img: Image.Image) -> list[Image.Image]:
    W, H = img.size
    frames = []
    for x0 in (0, W // 2):
        cell = np.array(img.crop((x0, 0, x0 + W // 2, H)).convert('RGB'))
        a = keyed_alpha(cell)
        a = a * dilate(largest_component(a > 0.5), 2)
        rgba = np.dstack([despill(cell, a), a * 255.0]).astype(np.uint8)
        # 시트의 늑대는 왼쪽을 보고 있고 게임의 진행 방향은 오른쪽이라 좌우를 뒤집는다
        frames.append(Image.fromarray(rgba, 'RGBA').transpose(Image.FLIP_LEFT_RIGHT))
    return frames


def main():
    frames = cut(Image.open(SRC))
    frames = [f.crop(f.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()) for f in frames]
    scale = BODY_H / frames[0].height
    frames = [f.resize((max(1, round(f.width * scale)), max(1, round(f.height * scale))), Image.LANCZOS) for f in frames]
    cxs = []
    for f in frames:
        a = np.array(f.getchannel('A')).astype(np.float32)
        cxs.append(float((a.sum(axis=0) * np.arange(f.width)).sum() / a.sum()))
    cw = int(round(max(max(cx, f.width - cx) for f, cx in zip(frames, cxs)) * 2)) + PAD * 2
    ch = max(f.height for f in frames) + PAD * 2
    os.makedirs(OUT, exist_ok=True)
    for name, f, cx in zip(NAMES, frames, cxs):
        canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        canvas.paste(f, (int(round(cw / 2 - cx)), ch - PAD - f.height), f)       # 몸 중심은 가운데, 발은 아래에 맞춘다
        canvas.save(os.path.join(OUT, name + '.png'), optimize=True)
        print(f'{name}.png  {cw}x{ch}  (몸 {f.width}x{f.height})')


if __name__ == '__main__':
    main()
