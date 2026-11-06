"""
건물 자리(돌 테두리 터) 그림 한 장을 게임용 PNG(spot.png)로 만든다.

  python scripts/slice-spot.py [원본] [출력폴더]

자홍색 배경과 떨어져 있는 조각(오른쪽 아래의 생성 도구 별 로고)은 고블린과 같은 방식으로 지운다 (sprite_tools.py).
결과는 화면 표시 크기의 2배다 (게임에서 0.5배로 그린다). 원본이 매우 크므로 저장소에는 터가 있는 부분만 잘라 JPEG 로 둔다.
"""
import os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sprite_tools import despill, dilate, keyed_alpha, largest_component   # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'docs', 'art', 'source', 'spot.jpg')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', 'public', 'skins', 'png')
WIDTH = 124        # 2배 해상도 기준 폭. 화면에서는 62px (기존 SVG 터는 56px)
PAD = 4


def main():
    img = Image.open(SRC).convert('RGB')
    cell = np.array(img)
    a = keyed_alpha(cell)
    a = a * dilate(largest_component(a > 0.5), 2)
    rgba = np.dstack([despill(cell, a), a * 255.0]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA')
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox())
    im = im.resize((WIDTH, max(1, round(im.height * WIDTH / im.width))), Image.LANCZOS)
    canvas = Image.new('RGBA', (im.width + PAD * 2, im.height + PAD * 2), (0, 0, 0, 0))
    canvas.paste(im, (PAD, PAD), im)
    os.makedirs(OUT, exist_ok=True)
    canvas.save(os.path.join(OUT, 'spot.png'), optimize=True)
    print(f'spot.png  {canvas.width}x{canvas.height}')


if __name__ == '__main__':
    main()
