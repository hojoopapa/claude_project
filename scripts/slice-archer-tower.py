"""
궁수탑 1~3레벨 그림 시트(2x2, 왼쪽 위=LV1, 오른쪽 위=LV2, 왼쪽 아래=LV3, 오른쪽 아래는 쓰지 않음)를
잘라서 게임용 PNG 3장(t_archer_1~3.png)으로 만든다.

  python scripts/slice-archer-tower.py [시트.png] [출력폴더]

자홍색 배경 제거, "LV 1" 같은 글자 제거는 고블린과 같은 방식이다 (sprite_tools.py).
세 장은 같은 비율로 줄여서 레벨이 오를수록 탑이 실제로 더 커 보이게 하고, 탑 바닥이 이미지 높이의 90% 지점에 오도록 맞춘다
(게임에서 타워 기준점이 아래 90% 이다). 결과는 화면 표시 크기의 2배다 (게임에서 0.5배로 그린다).
"""
import os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sprite_tools import despill, dilate, keyed_alpha, largest_component   # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'docs', 'art', 'source', 'archer_123.png')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', 'public', 'skins', 'png')

# 시트에서 각 그림이 있는 영역 (x0, y0, x1, y1). 윗줄과 아랫줄 사이 빈 틈(왼쪽 y 440~490, 오른쪽 y 430~445)에서 나눈다.
# 오른쪽 아래 탑의 뾰족한 끝이 오른쪽 위 칸에 걸쳐 있지만 LV2 와 떨어져 있어서 가장 큰 덩어리만 남기면 사라진다.
CROPS = {'t_archer_1': (0, 0, 380, 465), 't_archer_2': (380, 0, 759, 440), 't_archer_3': (0, 465, 380, 1023)}
LV1_H = 132        # LV1 탑 높이(2배 해상도 기준, 화면에서는 66px). 나머지는 같은 비율로 줄인다
FOOT = 0.90        # 탑 바닥이 이미지 높이의 몇 % 지점에 오게 할지 (게임의 기준점 y 와 같다)
PAD = 8


def extract(img: Image.Image, box) -> Image.Image:
    cell = np.array(img.crop(box).convert('RGB'))
    a = keyed_alpha(cell)
    a = a * dilate(largest_component(a > 0.5), 2)          # 글자와 떨어진 조각은 여기서 사라진다
    rgba = np.dstack([despill(cell, a), a * 255.0]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA')
    return im.crop(im.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox())


def main():
    img = Image.open(SRC)
    towers = {k: extract(img, box) for k, box in CROPS.items()}
    scale = LV1_H / towers['t_archer_1'].height
    os.makedirs(OUT, exist_ok=True)
    for name, t in towers.items():
        t = t.resize((max(1, round(t.width * scale)), max(1, round(t.height * scale))), Image.LANCZOS)
        a = np.array(t.getchannel('A')).astype(np.float32)
        low = a[int(t.height * 0.8):]                       # 아래쪽 20% (돌 바닥) 의 무게중심을 탑 중심으로 본다 (깃발이 한쪽에 달려 있어서)
        cx = float((low.sum(axis=0) * np.arange(t.width)).sum() / low.sum())
        cw = int(round(max(cx, t.width - cx) * 2)) + PAD * 2
        ch = int(round((t.height + PAD) / FOOT))
        canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        canvas.paste(t, (int(round(cw / 2 - cx)), int(round(ch * FOOT)) - t.height), t)
        canvas.save(os.path.join(OUT, name + '.png'), optimize=True)
        print(f'{name}.png  {cw}x{ch}  (탑 {t.width}x{t.height})')


if __name__ == '__main__':
    main()
