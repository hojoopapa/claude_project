#!/usr/bin/env python3
"""이미지 생성 AI(Gemini, ChatGPT 등)가 만든 원본(assets-inbox/)을 게임용 PNG(public/skins/image/)로 변환한다.

- 파일 이름이 docs/art/manifest.json 의 key 와 정확히 같아야 한다 (예: t_archer_1.png). 하위 폴더는 상관없다.
- 캐릭터/타워/소품: 마젠타(#FF00FF) 배경을 투명하게 만들고(가장자리 번짐 제거), 여백을 자르고,
  manifest 의 out_w x out_h 안에 비율을 유지해 맞춘 뒤 캔버스에 배치한다 (땅에 서는 것은 아래 중앙, 공중/효과는 중앙).
- 타일(g_*, r_*): 중앙 정사각형으로 잘라 out 크기로 줄인다. 배경 제거는 하지 않는다.
- 이미지 오른쪽 아래 모서리(12% x 12%)는 마젠타로 덮는다 (생성 서비스가 넣는 워터마크 제거용. 피사체는 모서리에 닿지 않게 만든다. 끄려면 --keep-corner).
- 결과 목록은 public/skins/image/index.json 에 쓴다. 게임은 이 목록에 있는 그림을 쓰고, 없는 그림은 SVG 스킨으로 대신한다.

사용법: python3 scripts/process-assets.py [--inbox assets-inbox] [--out public/skins/image] [--keep-corner]
필요: pip install pillow numpy
"""
import argparse, json, pathlib, sys
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
CENTER = {'e_wisp', 'e_bat', 'e_drake', 'spot', 'p_arrow', 'p_orb', 'p_ball'}
# 본체와 떨어진 조각(떠다니는 구슬, 효과 등)을 지우는 에셋. 가장 큰 덩어리만 남긴다.
KEEP_LARGEST = set()
# 원본 이미지 좌표(x0, y0, x1, y1)의 영역을 지운다. 본체와 이어진 효과 조각을 지울 때 쓴다 (원본 597x800 기준).
ERASE = {
    'soldier': [(0, 0, 185, 240), (0, 0, 145, 300), (420, 60, 597, 230)],   # 떠 있는 마법 구슬과 효과 가루
    'h_knight': [(398, 60, 597, 200)],                  # 투구 뒤에 떠 있는 왕관
}
# 차가운 색(청록/하늘색) 몸체: 붉은 성분이 초록보다 높지 않게 눌러 보라색 번짐을 파란색 쪽으로 보정한다.
COOL = {'e_wisp', 'e_wraith'}


def clean_corner(im: Image.Image) -> Image.Image:
    im = im.convert('RGB').copy()
    w, h = im.size
    im.paste((255, 0, 255), (int(w * 0.88), int(h * 0.88), w, h))
    return im


def erase_regions(im: Image.Image, key: str) -> Image.Image:
    boxes = ERASE.get(key)
    if not boxes:
        return im
    im = im.convert('RGB').copy()
    sx, sy = im.width / 597, im.height / 800
    for x0, y0, x1, y1 in boxes:
        im.paste((255, 0, 255), (round(x0 * sx), round(y0 * sy), round(x1 * sx), round(y1 * sy)))
    return im


def key_magenta(im: Image.Image, cool: bool = False) -> Image.Image:
    a = np.asarray(im.convert('RGB'), dtype=np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.sqrt((255 - r) ** 2 + g ** 2 + (255 - b) ** 2)      # 마젠타와의 거리
    alpha = np.clip((d - 75) / 70, 0, 1)                         # 75 이하는 완전 투명, 145 이상은 불투명
    m = np.array([255.0, 0.0, 255.0])
    safe = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip((a - (1 - alpha)[..., None] * m) / safe, 0, 255)  # 가장자리에 섞인 마젠타 제거
    # 실루엣 가장자리 띠(약 14px)에 남는 보라색 번짐 제거: 붉은색과 파란색이 초록보다 높은 만큼 깎는다.
    # (본체 안쪽의 보라색 옷 같은 색은 건드리지 않도록 가장자리 띠에만 적용한다)
    band = alpha < 0.5
    for _ in range(14):
        grown = band.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            grown |= np.roll(np.roll(band, dy, 0), dx, 1)
        band = grown
    band &= alpha > 0
    spill = np.clip(np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1], 0, 255) * band
    rgb[..., 0] -= spill
    rgb[..., 2] -= spill
    if cool:
        rgb[..., 0] = np.minimum(rgb[..., 0], rgb[..., 1])
        rgb[..., 2] = np.minimum(rgb[..., 2], rgb[..., 1] + 45)
    out = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    out[alpha <= 0, :3] = 0
    return Image.fromarray(out, 'RGBA')


def keep_largest(im: Image.Image, cell: int = 4) -> Image.Image:
    """알파가 있는 덩어리 중 가장 큰 것만 남긴다 (조각들 사이 틈은 몇 칸까지 이어진 것으로 본다)."""
    a = np.asarray(im.getchannel('A'))
    h, w = a.shape
    H, W = (h + cell - 1) // cell, (w + cell - 1) // cell
    pad = np.zeros((H * cell, W * cell), dtype=bool)
    pad[:h, :w] = a > 200
    small = pad.reshape(H, cell, W, cell).any(axis=(1, 3))
    # 틈을 메우기 위해 한 칸 팽창
    grown = small.copy()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
        grown |= np.roll(np.roll(small, dy, 0), dx, 1)
    labels = np.zeros((H, W), dtype=np.int32)
    sizes = {}
    n = 0
    for y in range(H):
        for x in range(W):
            if grown[y, x] and labels[y, x] == 0:
                n += 1
                stack = [(y, x)]
                labels[y, x] = n
                cnt = 0
                while stack:
                    cy, cx = stack.pop()
                    cnt += int(small[cy, cx])
                    for ny in (cy - 1, cy, cy + 1):
                        for nx in (cx - 1, cx, cx + 1):
                            if 0 <= ny < H and 0 <= nx < W and grown[ny, nx] and labels[ny, nx] == 0:
                                labels[ny, nx] = n
                                stack.append((ny, nx))
                sizes[n] = cnt
    if not sizes:
        return im
    best = max(sizes, key=sizes.get)
    keep = np.kron((labels == best).astype(np.uint8), np.ones((cell, cell), dtype=np.uint8))[:h, :w] > 0
    out = np.asarray(im).copy()
    out[~keep, 3] = 0
    return Image.fromarray(out, 'RGBA')


def fit(im: Image.Image, w: int, h: int, bottom: bool) -> Image.Image:
    bbox = im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bbox:
        raise ValueError('투명 이미지 (배경이 마젠타가 아니거나 피사체가 없음)')
    im = im.crop(bbox)
    pad = 2
    s = min((w - 2 * pad) / im.width, (h - 2 * pad) / im.height)
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    x = (w - im.width) // 2
    y = h - im.height - pad if bottom else (h - im.height) // 2
    canvas.paste(im, (x, y), im)
    return canvas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--inbox', default=str(ROOT / 'assets-inbox'))
    ap.add_argument('--out', default=str(ROOT / 'public/skins/image'))
    ap.add_argument('--keep-corner', action='store_true')
    args = ap.parse_args()
    inbox, out = pathlib.Path(args.inbox), pathlib.Path(args.out)
    manifest = json.load(open(ROOT / 'docs/art/manifest.json', encoding='utf8'))
    by_key = {a['key']: a for a in manifest['assets']}

    files = {}
    unknown = []
    for p in sorted(inbox.rglob('*')):
        if p.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
            continue
        (files.__setitem__(p.stem, p) if p.stem in by_key else unknown.append(p.name))

    done, failed = [], []
    for key, p in files.items():
        a = by_key[key]
        try:
            im = Image.open(p)
            if a['category'] == 'tiles':
                s = min(im.size)
                im = im.convert('RGB').crop(((im.width - s) // 2, (im.height - s) // 2, (im.width + s) // 2, (im.height + s) // 2))
                res = im.resize((a['out_w'], a['out_h']), Image.LANCZOS).convert('RGBA')
            else:
                bottom = key not in CENTER
                src = im if args.keep_corner else clean_corner(im)
                keyed = key_magenta(erase_regions(src, key), cool=key in COOL)
                if key in KEEP_LARGEST:
                    keyed = keep_largest(keyed)
                res = fit(keyed, a['out_w'], a['out_h'], bottom)
            dst = out / a['category'] / f'{key}.png'
            dst.parent.mkdir(parents=True, exist_ok=True)
            res.save(dst, optimize=True)
            done.append(key)
        except Exception as e:  # noqa: BLE001
            failed.append((key, str(e)))

    out.mkdir(parents=True, exist_ok=True)
    index = {k: {'file': f"{by_key[k]['category']}/{k}.png", 'w': by_key[k]['out_w'], 'h': by_key[k]['out_h']} for k in done}
    # 이전에 변환해 둔 파일도 목록에 유지
    for k, a in by_key.items():
        if k not in index and (out / a['category'] / f'{k}.png').exists():
            index[k] = {'file': f"{a['category']}/{k}.png", 'w': a['out_w'], 'h': a['out_h']}
    json.dump(index, open(out / 'index.json', 'w'), indent=1)

    print(f'변환 {len(done)}개, 실패 {len(failed)}개, 알 수 없는 파일 {len(unknown)}개')
    for k, e in failed:
        print('  실패', k, e)
    for n in unknown:
        print('  이름이 manifest key 와 다름:', n)
    for pr in (1, 2, 3):
        miss = [k for k, a in by_key.items() if a['priority'] == pr and k not in index]
        print(f'P{pr} 아직 없는 에셋 {len(miss)}개' + (': ' + ', '.join(miss) if miss and len(miss) <= 25 else ''))
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
