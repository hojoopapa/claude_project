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


BG_SCALE = 0.18      # 원본 대비 크기. 나무 높이가 약 45px (병사 28px 보다 조금 큼)


def bg():
    """지역 띠(약 582x1440)를 작게 줄이고, 거기서 무작위 위치의 조각을 격자로 이어 붙여 화면을 채운다.
    조각은 가장자리 14px 를 서로 겹쳐 섞는다 (대칭 무늬가 생기지 않도록 뒤집지 않는다)."""
    im = Image.open(os.path.join(SRC, 'bg.png')).convert('RGB')
    W, H = im.size
    sw = W / 5
    inner = int(sw) - 100                         # 띠 양옆 50px 은 이웃 지역과 섞여 있어 버린다
    os.makedirs(os.path.join(OUT, 'bg'), exist_ok=True)
    f = 14
    for i, th in enumerate(THEMES):
        x0 = round(i * sw + 50)
        strip = im.crop((x0, 0, x0 + inner, 1330))                 # 아래쪽 구석 로고(y>1330) 제외
        cw, chh = round(inner * BG_SCALE), round(1330 * BG_SCALE)
        st = np.array(strip.resize((cw, chh), Image.LANCZOS)).astype(np.float32)
        ph = 96                                                    # 조각 높이 (겹침 포함)
        wx = np.minimum(np.arange(cw) + 1, np.arange(cw)[::-1] + 1)
        wy = np.minimum(np.arange(ph) + 1, np.arange(ph)[::-1] + 1)
        win = np.minimum(np.minimum(wy[:, None], wx[None, :]), f).astype(np.float32) / f + 0.02
        for j in range(4):
            rnd = np.random.RandomState(1000 * (i + 1) + j)
            acc = np.zeros((GH + 3 * ph, GW + 3 * cw, 3), np.float32)
            wsum = np.zeros((GH + 3 * ph, GW + 3 * cw, 1), np.float32)
            # 조각을 한 줄씩 놓되 가로 간격, 세로 위치, 좌우 뒤집기를 무작위로 해서 격자 무늬가 안 보이게 한다
            y = -rnd.randint(ph)
            while y < GH:
                x = -rnd.randint(cw)
                while x < GW:
                    yy = rnd.randint(0, chh - ph)
                    pt = st[yy:yy + ph]
                    if rnd.rand() < 0.5:
                        pt = pt[:, ::-1]
                    y0, x0_ = y + ph, x + cw                          # 버퍼 여백(ph, cw)만큼 밀어 음수 좌표를 피한다
                    acc[y0:y0 + ph, x0_:x0_ + cw] += pt * win[..., None]
                    wsum[y0:y0 + ph, x0_:x0_ + cw] += win[..., None]
                    x += int(cw * rnd.uniform(0.84, 0.97))
                y += int(ph * rnd.uniform(0.8, 0.95))
            out = (acc / np.maximum(wsum, 1e-3))[ph:ph + GH, cw:cw + GW]
            Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(os.path.join(OUT, 'bg', f'bg_{th}_{j + 1}.jpg'), quality=85, optimize=True)
    print('bg', len(THEMES) * 4)


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
