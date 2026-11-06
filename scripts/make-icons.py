"""
앱 아이콘(바탕화면, 홈 화면에 저장할 때 쓰는 그림)을 용 그림으로 만든다.

  python scripts/make-icons.py [용 그림.png] [출력폴더]

어두운 붉은 배경 + 주황 빛 위에 용을 얹은 정사각형 아이콘을 1024px 로 그린 뒤 여러 크기로 줄인다.
안드로이드의 마스크(둥근/물방울) 아이콘은 가장자리를 잘라 쓰므로 용은 가운데 70% 안에 둔다 (모든 크기에 같은 그림을 쓴다).
출력: icon-512.png, icon-192.png, apple-touch-icon.png(180), favicon-32.png, favicon.ico(16~256)
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'docs', 'art', 'source', 'dragon_cutout.png')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', 'public', 'icons')
S = 1024


def background() -> Image.Image:
    """가운데가 주황빛으로 밝고 가장자리로 갈수록 어두운 붉은색 (약올림 팝업의 붉은 빛과 같은 분위기)."""
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    d = np.sqrt(((xx - S * 0.5) / (S * 0.62)) ** 2 + ((yy - S * 0.56) / (S * 0.62)) ** 2)
    t = np.clip(d, 0, 1)[..., None]
    inner, mid, outer = np.array([255, 146, 58]), np.array([168, 40, 36]), np.array([34, 10, 18])
    col = np.where(t < 0.55, inner + (mid - inner) * (t / 0.55), mid + (outer - mid) * ((t - 0.55) / 0.45))
    return Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), 'RGB').convert('RGBA')


def main():
    dragon = Image.open(SRC).convert('RGBA')
    k = (S * 0.70) / max(dragon.width, dragon.height)
    dragon = dragon.resize((round(dragon.width * k), round(dragon.height * k)), Image.LANCZOS)

    icon = background()
    pos = ((S - dragon.width) // 2, int(S * 0.5 - dragon.height * 0.5))
    # 용 뒤의 그림자(어두운 윤곽)와 바닥 빛
    shadow = Image.new('RGBA', icon.size, (0, 0, 0, 0))
    shadow.paste((20, 4, 8, 150), (pos[0] + 10, pos[1] + 16), dragon.getchannel('A'))
    icon.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(14)))
    icon.alpha_composite(dragon, pos)

    os.makedirs(OUT, exist_ok=True)
    rgb = icon.convert('RGB')
    for name, size in (('icon-512.png', 512), ('icon-192.png', 192), ('apple-touch-icon.png', 180), ('favicon-32.png', 32)):
        rgb.resize((size, size), Image.LANCZOS).save(os.path.join(OUT, name), optimize=True)
        print(name, size)
    rgb.save(os.path.join(OUT, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print('favicon.ico 16~256')


if __name__ == '__main__':
    main()
