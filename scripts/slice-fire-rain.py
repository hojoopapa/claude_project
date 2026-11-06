"""
화염비 시트(docs/art/source/fire_rain.jpg, 검은 배경 픽셀 불꽃)에서 낙하 5프레임과 착탄 9프레임을 잘라
스프라이트 시트 2장(public/skins/png/fire_fall.png, fire_hit.png)으로 만든다.

  python scripts/slice-fire-rain.py

검은 배경은 밝기로 투명하게 바꾼다 (밝을수록 불투명). 각 칸은 같은 크기라 게임에서 spritesheet 로 불러 쓴다
(BootScene 의 FIRE_SHEETS, 애니메이션 fire_fall / fire_hit).
"""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'docs', 'art', 'source', 'fire_rain.jpg')
OUT = os.path.join(HERE, '..', 'public', 'skins', 'png')

FALL = dict(x0=487, y0=40, cw=87.5, ch=88, n=5)                  # 맨 위 줄 앞 5칸: 떨어지는 불꽃 (뒤 5칸은 작아지는 불씨)
HIT = dict(x0=971, y0=200, cw=130, ch=118.67, cols=3, rows=3)    # 오른쪽 3x3: 착탄 효과 (왼쪽 위부터 차례대로)


def keyed(rgb: np.ndarray) -> Image.Image:
    a = np.clip((rgb.max(axis=2).astype(np.float32) - 40.0) / 70.0, 0, 1)    # 검정(배경, jpg 잡티)은 투명, 밝을수록 불투명
    return Image.fromarray(np.dstack([rgb, (a * 255).astype(np.uint8)]), 'RGBA')


def main():
    img = np.array(Image.open(SRC).convert('RGB'))
    os.makedirs(OUT, exist_ok=True)
    cw, ch, n = FALL['cw'], FALL['ch'], FALL['n']
    W, H = 88, 88
    sheet = Image.new('RGBA', (W * n, H), (0, 0, 0, 0))
    for i in range(n):
        x = int(FALL['x0'] + cw * i)
        sheet.paste(keyed(img[FALL['y0']:FALL['y0'] + H, x:x + W]), (W * i, 0))
    sheet.save(os.path.join(OUT, 'fire_fall.png'), optimize=True)
    W, H = 130, 118
    cols, rows = HIT['cols'], HIT['rows']
    sheet = Image.new('RGBA', (W * cols * rows, H), (0, 0, 0, 0))
    for k in range(cols * rows):
        r, c = divmod(k, cols)
        x, y = int(HIT['x0'] + HIT['cw'] * c), int(HIT['y0'] + HIT['ch'] * r)
        sheet.paste(keyed(img[y:y + H, x:x + W]), (W * k, 0))
    sheet.save(os.path.join(OUT, 'fire_hit.png'), optimize=True)
    print('fire_fall.png 88x88 x5, fire_hit.png 130x118 x9')


if __name__ == '__main__':
    main()
