"""
t_mage.png, t_thunder.png, wall.png (AI 시트, 자홍색 배경)에서 컷을 잘라 docs/art/source/cut 에 투명 PNG 로 저장한다.

  python scripts/cut-sheets2.py [시트폴더]   (기본: D 드라이브 AI_Works 아래 image)

시트마다 그림이 서로 겹치거나(번개타워 일부가 벽 뒤에 있음) 빛이 번져서 자동 분리가 안 되므로, 컷마다 영역과 지울 부분을 직접 지정했다.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = sys.argv[1] if len(sys.argv) > 1 else r'D:\AI_Works\image'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'art', 'source', 'cut')


def hsv(a):
    r, g, b = [a[..., i].astype(np.float32) / 255 for i in range(3)]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    d = mx - mn + 1e-6
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, d / (mx + 1e-6), mx


def cut(sheet, name, box, clear=(), extra=None):
    """box=(x0,y0,x1,y1), clear=[(x0,y0,x1,y1)...] 영역 지움, extra(a, h, s, v, X, Y)->지울 마스크"""
    im = Image.open(os.path.join(SRC, sheet + '.png')).convert('RGBA')
    a = np.array(im)
    h, s, v = hsv(a)
    bg = (h > 292) & (h < 338) & (s > 0.45) & (a[..., 0] > a[..., 2] * 0.9)
    Y, X = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    out = ~((X >= box[0]) & (X < box[2]) & (Y >= box[1]) & (Y < box[3]))
    for c in clear:
        out |= (X >= c[0]) & (X < c[2]) & (Y >= c[1]) & (Y < c[3])
    if extra is not None:
        out |= extra(h, s, v, X, Y)
    fg = ~bg & ~out
    fg = ndi.binary_opening(fg, iterations=2)
    lab, k = ndi.label(ndi.binary_dilation(fg, iterations=4))
    sz = ndi.sum(fg, lab, range(1, k + 1))
    fg &= lab == int(np.argmax(sz)) + 1
    fg = ndi.binary_fill_holes(fg) & ~bg if extra is None else fg
    a[..., 3] = (fg * 255).astype(np.uint8)
    ys, xs = np.where(fg)
    res = Image.fromarray(a[ys.min():ys.max() + 1, xs.min():xs.max() + 1])
    res.save(os.path.join(OUT, name + '.png'))
    print(name, res.size)


os.makedirs(OUT, exist_ok=True)
cut('t_mage', 'mage_lv1', (150, 60, 780, 740))
cut('t_mage', 'mage_lv2', (1050, 60, 1740, 1120))
cut('t_mage', 'mage_lv3', (300, 840, 1420, 2330))
cut('t_thunder', 'thunder_lv1', (130, 60, 760, 760))
cut('t_thunder', 'thunder_lv2', (1100, 60, 1740, 1100))
cut('t_thunder', 'thunder_lv3', (300, 740, 1400, 2330), clear=[(1150, 0, 1792, 1100)])

# 벽: 긴 것은 길이 위아래로 뻗은 곳(가로 벽), 짧은 것(_s)은 길이 좌우로 뻗은 곳(세로 벽)에 쓴다. 나무벽, 쇠벽은 긴 것만 있다.
cut('wall', 'wall_wood', (210, 60, 1590, 740))
cut('wall', 'wall_dirt', (200, 640, 1160, 1130))
cut('wall', 'wall_dirt_s', (1180, 570, 1700, 1040))
cut('wall', 'wall_brick', (190, 1120, 1130, 1700))
cut('wall', 'wall_brick_s', (1180, 1030, 1690, 1570))
cut('wall', 'wall_metal', (230, 1600, 1560, 2320))
