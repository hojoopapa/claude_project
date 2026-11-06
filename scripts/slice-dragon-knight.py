"""
용(대기, 브레스 준비)과 기사(준비, 공격 후) 시트(2x2)를 잘라서 게임용 PNG 4장으로 만든다.

  python scripts/slice-dragon-knight.py [시트.png] [출력폴더]

  dragon_idle.png / dragon_prep.png  : 왼쪽 위 = 대기, 오른쪽 위 = 브레스 준비 (볼을 부풀림). 둘 다 오른쪽을 본다
  h_knight.png / h_knight_atk.png    : 왼쪽 아래 = 준비, 오른쪽 아래 = 공격 후 (칼을 휘두른 자세)

자홍색 배경, 글자("IDLE", "얍!" 등), 떨어진 이펙트는 고블린과 같은 방식으로 지운다 (sprite_tools.py).
캐릭터마다 첫 장(대기/준비) 높이를 기준으로 같은 비율로 줄이고, 발(아랫부분) 중심을 맞춘다.
결과는 화면 표시 크기의 2배다 (게임에서 0.5배로 그린다).
"""
import os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sprite_tools import despill, dilate, keyed_alpha, largest_component   # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'docs', 'art', 'source', 'dragon_knight.png')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', 'public', 'skins', 'png')

# 시트에서 각 그림이 있는 영역 (x0, y0, x1, y1). 글자와 떨어진 조각은 가장 큰 덩어리만 남기면 사라진다.
SETS = {
    'dragon': {'height': 150, 'frames': [('dragon_idle', (100, 28, 470, 290)), ('dragon_prep', (530, 28, 960, 290))]},
    'knight': {'height': 112, 'frames': [('h_knight', (150, 320, 360, 572)), ('h_knight_atk', (540, 320, 900, 572))]},
}
PAD = 6
# 칼 효과선에 붙어 있는 "SLASH" 같은 글자는 덩어리가 이어져 있어서 안 지워진다: 시트 좌표 영역을 미리 투명 처리한다 (x0, y0, x1, y1)
ERASE = {'h_knight_atk': (770, 478, 900, 525)}
# 분홍색 칼 궤적 효과가 반투명 회색 얼룩으로 남는 컷: 투명도를 이 구간에서 0~1 로 다시 펴서 반투명한 효과만 지운다 (게임에서 따로 그린다)
SHARPEN = {'h_knight_atk': (0.6, 0.92)}


def extract(img: Image.Image, box, sharpen=None, erase=None) -> Image.Image:
    cell = np.array(img.crop(box).convert('RGB'))
    a = keyed_alpha(cell)
    if erase:
        a[max(0, erase[1] - box[1]):max(0, erase[3] - box[1]), max(0, erase[0] - box[0]):max(0, erase[2] - box[0])] = 0.0
    a = a * dilate(largest_component(a > 0.5), 2)
    if sharpen:
        lo, hi = sharpen
        a = np.clip((a - lo) / (hi - lo), 0.0, 1.0)
    rgba = np.dstack([despill(cell, a), a * 255.0]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA')
    return im.crop(im.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox())


def main():
    img = Image.open(SRC)
    os.makedirs(OUT, exist_ok=True)
    for cname, cfg in SETS.items():
        frames = [(name, extract(img, box, SHARPEN.get(name), ERASE.get(name))) for name, box in cfg['frames']]
        scale = cfg['height'] / frames[0][1].height                 # 첫 장 높이를 기준으로 같은 비율로 줄인다
        rs, cxs = [], []
        for name, f in frames:
            f = f.resize((max(1, round(f.width * scale)), max(1, round(f.height * scale))), Image.LANCZOS)
            a = np.array(f.getchannel('A')).astype(np.float32)
            low = a[int(f.height * 0.8):]                           # 아래 20%(발) 무게중심을 몸 중심으로 본다 (칼, 날개가 한쪽으로 뻗어 있어서)
            cxs.append(float((low.sum(axis=0) * np.arange(f.width)).sum() / max(low.sum(), 1)))
            rs.append((name, f))
        half = max(max(cx, f.width - cx) for (_, f), cx in zip(rs, cxs))
        cw = int(round(half * 2)) + PAD * 2
        ch = max(f.height for _, f in rs) + PAD * 2
        for (name, f), cx in zip(rs, cxs):
            canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
            canvas.paste(f, (int(round(cw / 2 - cx)), ch - PAD - f.height), f)
            canvas.save(os.path.join(OUT, name + '.png'), optimize=True)
            print(f'{name}.png  {cw}x{ch}  (몸 {f.width}x{f.height})')


if __name__ == '__main__':
    main()
