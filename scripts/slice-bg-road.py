"""
bg.png(지역 배경 5개를 가로로 붙인 그림)와 road.png(길 바닥 5개 + 길가 장식 5개)를 게임용으로 자른다.

  python scripts/slice-bg-road.py [시트폴더]      (기본: D 드라이브 AI_Works 아래 image)

만드는 것 (public/skins):
  bg/bg_<테마>_<1~4>.jpg   960x540 배경. 한 지역 띠(세로로 긴 그림)에서 위치를 달리해 4장 (테마당 스테이지 4개)
  road/road_<테마>.png     길 바닥 타일. 가로세로 거울 이음으로 이어 붙여도 이음매가 안 보인다
  road/rd_<테마>.png/.json 길가 장식 조각 모음 (Phaser 아틀라스). 덤불, 바위, 가시덩굴 등
테마 순서는 meadow, desert, swamp, snow, volcano (시트 왼쪽부터 / 위부터).
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = sys.argv[1] if len(sys.argv) > 1 else r'D:\AI_Works\image'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'skins')
THEMES = ['meadow', 'desert', 'swamp', 'snow', 'volcano']
GW, GH = 960, 540


def bg():
    """지역 띠(약 582x1440)에서 위치가 다른 두 곳을 좌우로 이어 붙인다 (거의 원본 크기라 나무가 타워보다 커지지 않는다)."""
    im = Image.open(os.path.join(SRC, 'bg.png')).convert('RGB')
    W, H = im.size
    sw = W / 5
    hw = GW // 2                                 # 반쪽 폭 480
    ys = [0, 270, 540, 788]                      # 반쪽이 시작하는 높이. 788 이하로 제한해 아래쪽 구석 로고(y>1330)를 피한다
    pairs = [(0, 2), (1, 3), (2, 0), (3, 1)]      # (왼쪽, 오른쪽) 위치 번호. 스테이지마다 다른 조합
    seam = 60
    os.makedirs(os.path.join(OUT, 'bg'), exist_ok=True)
    ramp = np.clip((np.arange(GW) - (hw - seam / 2)) / seam, 0, 1)[None, :, None]
    for i, th in enumerate(THEMES):
        x0 = round(i * sw + (sw - hw) / 2)       # 띠 가운데 480px (양옆 이웃 지역과 섞인 부분은 버린다)
        for j, (l, r) in enumerate(pairs):
            L = np.zeros((GH, GW, 3), np.float32)
            R = np.zeros((GH, GW, 3), np.float32)
            cl = im.crop((x0, ys[l], x0 + hw + seam // 2, ys[l] + GH))
            cr = im.crop((x0 - seam // 2, ys[r], x0 + hw, ys[r] + GH))
            L[:, :hw + seam // 2] = np.array(cl)
            R[:, hw - seam // 2:] = np.array(cr)
            out = L * (1 - ramp) + R * ramp
            Image.fromarray(out.astype(np.uint8)).save(os.path.join(OUT, 'bg', f'bg_{th}_{j + 1}.jpg'), quality=82, optimize=True)
    print('bg', len(THEMES) * len(pairs))


def cells():
    im = np.array(Image.open(os.path.join(SRC, 'road.png')).convert('RGB')).astype(int)
    pink = (im[..., 0] > 190) & (im[..., 1] < 100) & (im[..., 2] > 70) & (im[..., 2] < 150)
    lab, k = ndi.label(~pink)
    objs = ndi.find_objects(lab)
    sz = ndi.sum(~pink, lab, range(1, k + 1))
    big = [objs[i] for i in np.argsort(sz)[::-1][:10]]
    left = sorted([s for s in big if s[1].start < 500], key=lambda s: s[0].start)
    right = sorted([s for s in big if s[1].start >= 500], key=lambda s: s[0].start)
    return Image.open(os.path.join(SRC, 'road.png')).convert('RGB'), left, right


def road():
    im, left, _ = cells()
    os.makedirs(os.path.join(OUT, 'road'), exist_ok=True)
    for th, s in zip(THEMES, left):
        cx, cy = (s[1].start + s[1].stop) // 2, (s[0].start + s[0].stop) // 2
        crop = im.crop((cx - 400, cy - 70, cx + 400, cy + 70))     # 길 가운데 800x140 (가장자리 띠 제외)
        t = crop.resize((240, 42), Image.LANCZOS)
        tile = Image.new('RGB', (480, 84))
        tile.paste(t, (0, 0))
        tile.paste(t.transpose(Image.FLIP_LEFT_RIGHT), (240, 0))
        tile.paste(t.transpose(Image.FLIP_TOP_BOTTOM), (0, 42))
        tile.paste(t.transpose(Image.ROTATE_180), (240, 42))
        tile.save(os.path.join(OUT, 'road', f'road_{th}.png'), optimize=True)
    print('road', len(left))


def decor():
    """길가 장식 줄(한 줄로 이어진 그림)을 폭 170px 정도 조각으로 나눈다. 자르는 곳은 그림이 가장 적은 열."""
    im, _, right = cells()
    for th, s in zip(THEMES, right):
        a = np.array(im.crop((s[1].start + 14, s[0].start + 14, s[1].stop - 14, s[0].stop - 14))).astype(np.float32)   # 칸 가장자리 분홍 모서리 제외
        bgc = np.median(np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3)]), axis=0)
        dist = np.abs(a - bgc).sum(-1)
        al = np.clip((dist - 45) / 70, 0, 1)
        if th == 'volcano':
            al[-150:, -150:] = 0                 # 구석의 AI 로고
        al = ndi.binary_opening(al > 0.05, iterations=1) * al
        rgb = np.clip((a - (1 - al[..., None]) * bgc) / np.maximum(al[..., None], 0.05), 0, 255)
        ys, xs = np.where(al > 0.2)
        x0, x1 = xs.min(), xs.max() + 1
        n = max(2, round((x1 - x0) / 190))
        col = (al > 0.2).sum(0)
        cuts = [x0]
        for k in range(1, n):
            t = int(x0 + k * (x1 - x0) / n)
            w = col[t - 40:t + 40]
            cuts.append(t - 40 + int(np.argmin(w)))
        cuts.append(x1)
        parts = []
        for c0, c1 in zip(cuts[:-1], cuts[1:]):
            m = al[:, c0:c1]
            yy = np.where((m > 0.2).any(1))[0]
            if len(yy) == 0:
                continue
            y0, y1 = yy.min(), yy.max() + 1
            rgba = np.dstack([rgb[y0:y1, c0:c1].astype(np.uint8), (m[y0:y1] * 255).astype(np.uint8)])
            p = Image.fromarray(rgba, 'RGBA')
            parts.append(p.resize((max(1, round(p.width * 0.28)), max(1, round(p.height * 0.28))), Image.LANCZOS))
        pw = sum(p.width + 2 for p in parts)
        sheet = Image.new('RGBA', (pw, max(p.height for p in parts)), (0, 0, 0, 0))
        frames, x = {}, 0
        for n_, p in enumerate(parts):
            sheet.paste(p, (x, 0), p)
            frames[f'{n_}'] = {'frame': {'x': x, 'y': 0, 'w': p.width, 'h': p.height}, 'spriteSourceSize': {'x': 0, 'y': 0, 'w': p.width, 'h': p.height}, 'sourceSize': {'w': p.width, 'h': p.height}}
            x += p.width + 2
        sheet.save(os.path.join(OUT, 'road', f'rd_{th}.png'), optimize=True)
        json.dump({'frames': frames, 'meta': {'image': f'rd_{th}.png', 'size': {'w': sheet.width, 'h': sheet.height}, 'scale': 1}}, open(os.path.join(OUT, 'road', f'rd_{th}.json'), 'w'))
        print('decor', th, len(parts), sheet.size)


if __name__ == '__main__':
    bg(); road(); decor()
