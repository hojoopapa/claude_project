"""
시작 화면 그림(start.png: 한 장짜리 화면 시안)에서 게임에 쓸 두 가지를 만든다.

  python scripts/prepare-start-art.py [원본.png] [출력폴더]

1) start_bg.jpg   : 그림 속에 박혀 있는 제목, 버튼, 소리/언어 버튼을 주변 색으로 지운 배경 (UI 는 게임이 직접 그린다)
2) breath_flame.png : 용 옆의 불꽃 (브레스 연출용)
(용과 기사는 새로 받은 시트 용.png 를 쓰므로 여기서는 뽑지 않는다: scripts/slice-dragon-knight.py)

원본 이미지를 바꾸면 아래 REGIONS, FLAME_BOX 의 좌표를 확인한다 (원본 1672x941 기준 픽셀).
(이전 원본에는 오른쪽 아래 반투명 별 워터마크가 있어 지우는 함수를 썼으나, 새 원본에는 없어 뺐다. 필요하면 git 기록 bad0e31 의 remove_sparkle 참고)
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'docs', 'art', 'source', 'start.png')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, '..', 'public', 'skins', 'png')

# 지울 영역 (x0, y0, x1, y1). 글자와 버튼 주변의 빛번짐까지 포함한다.
REGIONS = {
    'title': (495, 50, 1185, 234),            # 제목 "왕국 수호대"
    'buttons': (645, 686, 1040, 925),           # "게임 시작" + "랭킹" (아래쪽은 그림 끝)
    'top_buttons': (1352, 6, 1664, 108),        # 소리, 언어 버튼 (그림 맨 위라 위쪽에 하늘색 여백을 덧붙여 색을 잰다)
}
FLAME_BOX = (1192, 679, 1312, 770)             # 불꽃이 들어 있는 영역
FLAME_W = 110                                  # 불꽃 폭 (2배 해상도 기준)
BG_SIZE = (1920, 1080)                         # 화면 960x540 의 2배 해상도 (원본 비율 16:9)


def _smooth(v: np.ndarray, k: int) -> np.ndarray:
    """1차원 이동 평균 (색 프로필의 잡티를 눌러 준다)."""
    pad = np.pad(v, ((k, k), (0, 0)), mode='edge')
    c = np.cumsum(np.vstack([np.zeros((1, v.shape[1])), pad]), axis=0)
    return (c[2 * k + 1:] - c[:-2 * k - 1]) / (2 * k + 1)


def _robust_curve(v: np.ndarray, deg: int = 2) -> np.ndarray:
    """(N,3) 색 프로필을 낮은 차수 곡선으로 맞춘다. 구름, 깃대, 별 같은 튀는 픽셀은 여러 번 걸러 내며 무시한다."""
    n = len(v)
    t = np.linspace(-1.0, 1.0, n)
    out = np.empty_like(v, dtype=np.float32)
    for c in range(3):
        keep = np.ones(n, bool)
        for _ in range(6):
            coef = np.polyfit(t[keep], v[keep, c], deg)
            res = np.abs(np.polyval(coef, t) - v[:, c])
            new = res < max(10.0, 2.0 * float(np.median(res[keep])))
            if new.sum() < n * 0.35 or (new == keep).all():
                break
            keep = new
        out[:, c] = np.polyval(np.polyfit(t[keep], v[keep, c], deg), t)
    return out


def inpaint(img: np.ndarray, box, feather=4, robust=True) -> np.ndarray:
    """
    box 안을 네 변 바깥쪽 색의 변화를 이어서 채운다 (Coons 보간).
    하늘과 풀밭처럼 색이 완만하게 변하는 배경에 맞고, 가장자리는 feather 픽셀에 걸쳐 원래 그림과 섞는다.
    """
    x0, y0, x1, y1 = box
    f = img.astype(np.float32)
    W, H = x1 - x0, y1 - y0
    g, n = 6, 10                                              # 가장자리에서 g 픽셀 떨어진 n 픽셀 폭의 띠에서 색을 잰다 (가장자리 번짐을 피한다)
    L = np.median(f[y0:y1, x0 - g - n:x0 - g], axis=1)        # (H,3) 왼쪽 바깥 띠, 행마다
    R = np.median(f[y0:y1, x1 + g:x1 + g + n], axis=1)
    T = np.median(f[y0 - g - n:y0 - g, x0:x1], axis=0)        # (W,3) 위쪽 바깥 띠, 열마다
    B = np.median(f[y1 + g:y1 + g + n, x0:x1], axis=0)
    L, R, T, B = [_robust_curve(e) if robust else _smooth(e, 9) for e in (L, R, T, B)]
    u = ((np.arange(W) + 0.5) / W)[None, :, None]
    v = ((np.arange(H) + 0.5) / H)[:, None, None]
    horiz = (1 - u) * L[:, None, :] + u * R[:, None, :]
    vert = (1 - v) * T[None, :, :] + v * B[None, :, :]
    c00, c10, c01, c11 = L[0], R[0], L[-1], R[-1]
    corner = (1 - u) * (1 - v) * c00 + u * (1 - v) * c10 + (1 - u) * v * c01 + u * v * c11
    fill = horiz + vert - corner

    # 안쪽은 새로 채운 색, 가장자리 feather 픽셀은 원래 그림과 부드럽게 섞는다
    dx = np.minimum(np.arange(W), W - 1 - np.arange(W))[None, :]
    dy = np.minimum(np.arange(H), H - 1 - np.arange(H))[:, None]
    a = np.clip(np.minimum(dx, dy) / float(feather), 0, 1)[..., None]
    out = img.copy()
    out[y0:y1, x0:x1] = np.clip(fill * a + f[y0:y1, x0:x1] * (1 - a), 0, 255).astype(img.dtype)
    return out


def largest(mask: np.ndarray) -> np.ndarray:
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    best, best_n = None, 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]: continue
        stack, comp = [(y0, x0)], []
        seen[y0, x0] = True
        while stack:
            y, x = stack.pop(); comp.append((y, x))
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; stack.append((ny, nx))
        if len(comp) > best_n: best, best_n = comp, len(comp)
    out = np.zeros_like(mask, dtype=bool)
    for y, x in best: out[y, x] = True
    return out


def erode(mask: np.ndarray, n=1) -> np.ndarray:
    out = mask.copy()
    for _ in range(n):
        p = np.pad(out, 1)
        out = p[1:-1, 1:-1] & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]
    return out


def dilate(mask: np.ndarray, n=1) -> np.ndarray:
    out = mask.copy()
    for _ in range(n):
        p = np.pad(out, 1)
        out = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return out


def cut_flame(img: np.ndarray):
    x0, y0, x1, y1 = FLAME_BOX
    crop = img[y0:y1, x0:x1].astype(np.int16)
    warm = ((crop[..., 0] - crop[..., 2]) > 110) & (crop[..., 0] >= crop[..., 1] - 30)   # 불꽃은 주황, 노랑, 붉은 윤곽 (풀밭은 초록이 빨강보다 훨씬 크다)
    warm = dilate(erode(warm, 3), 3)                  # 가는 돌출(용 코끝 등)을 떼어 낸다
    return crop, largest(dilate(warm, 1))


def finish_cut(crop: np.ndarray, fg: np.ndarray, name: str, *, height=None, width=None, pad=6, feather=0.7) -> Image.Image:
    """마스크를 부드럽게 다듬고 여백을 맞춰 PNG 로 저장한다 (가장자리 한 겹은 벗긴다)."""
    fg = erode(fg, 1)
    alpha = np.array(Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(feather))).astype(np.uint8)
    im = Image.fromarray(np.dstack([crop.astype(np.uint8), alpha]), 'RGBA')
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
    scale = (height / im.height) if height else (width / im.width)
    im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    canvas = Image.new('RGBA', (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(im, (pad, pad), im)
    canvas.save(os.path.join(OUT, name), optimize=True)
    return canvas


def main():
    img = np.array(Image.open(SRC).convert('RGB'))
    print('원본', img.shape[1], 'x', img.shape[0])

    # 1) 배경: 박혀 있는 UI 와 워터마크를 지운다
    PAD = 24                                                  # 위쪽 가장자리에 가까운 영역은 바깥 색을 잴 자리가 없어 윗줄을 복제해 덧붙인다
    bg = np.pad(img, ((PAD, 0), (0, 0), (0, 0)), mode='edge')
    for name, (x0, y0, x1, y1) in REGIONS.items():
        bg = inpaint(bg, (x0, y0 + PAD, x1, y1 + PAD)); print('지움:', name)
    bg = bg[PAD:]
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(bg).resize(BG_SIZE, Image.LANCZOS).save(os.path.join(OUT, 'start_bg.jpg'), quality=88, optimize=True, progressive=True)

    # 2) 브레스 불꽃
    fc, ffg = cut_flame(img)
    print('불꽃:', finish_cut(fc, ffg, 'breath_flame.png', width=FLAME_W).size)

if __name__ == '__main__':
    main()
