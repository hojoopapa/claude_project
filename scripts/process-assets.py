#!/usr/bin/env python3
"""ChatGPT 원본(assets-inbox/)을 게임용 PNG(public/assets/)로 변환한다.

- 파일 이름이 docs/art/manifest.json 의 key 와 정확히 같아야 한다 (예: t_archer_1.png). 하위 폴더는 상관없다.
- 캐릭터/타워/소품: 마젠타(#FF00FF) 배경을 투명하게 만들고(가장자리 번짐 제거), 여백을 자르고,
  manifest 의 out_w x out_h 안에 비율을 유지해 맞춘 뒤 캔버스에 배치한다 (땅에 서는 것은 아래 중앙, 공중/효과는 중앙).
- 타일(g_*, r_*): 중앙 정사각형으로 잘라 out 크기로 줄인다. 배경 제거는 하지 않는다.
- 결과 목록은 public/assets/index.json 에 쓴다 (게임이 어떤 에셋이 있는지 확인할 때 쓴다).

사용법: python3 scripts/process-assets.py [--inbox assets-inbox] [--out public/assets]
필요: pip install pillow numpy
"""
import argparse, json, pathlib, sys
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
CENTER = {'e_wisp', 'e_bat', 'e_drake', 'spot', 'p_arrow', 'p_orb', 'p_ball'}


def key_magenta(im: Image.Image) -> Image.Image:
    a = np.asarray(im.convert('RGB'), dtype=np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.sqrt((255 - r) ** 2 + g ** 2 + (255 - b) ** 2)      # 마젠타와의 거리
    alpha = np.clip((d - 60) / 70, 0, 1)                         # 60 이하는 완전 투명, 130 이상은 불투명
    m = np.array([255.0, 0.0, 255.0])
    safe = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip((a - (1 - alpha)[..., None] * m) / safe, 0, 255)  # 가장자리에 섞인 마젠타 제거
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    out[alpha <= 0, :3] = 0
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
    ap.add_argument('--out', default=str(ROOT / 'public/assets'))
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
                res = fit(key_magenta(im), a['out_w'], a['out_h'], bottom)
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
