"""
고블린 1레벨 프레임(걷기 2장, 공격 2장)이 2x2로 그려진 시트를 잘라서 게임용 PNG 4장으로 만든다.

  python scripts/slice-goblin-frames.py [시트.png] [출력폴더]

처리 순서: 칸 나누기 -> 자홍색 배경을 투명하게(가장자리는 부드럽게, 배경색 번짐 제거) -> 칸마다 가장 큰 덩어리만 남겨
"WALK 1" 같은 글자, 효과선, 반짝이를 지운다 -> 네 장을 같은 비율로 줄여서 발 위치와 몸 중심을 맞춘 같은 크기의 캔버스에 담는다.
결과는 화면 표시 크기의 2배다 (게임에서 0.5배로 그린다).
"""
import os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sprite_tools import despill, dilate, keyed_alpha, largest_component   # noqa: E402

SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'docs', 'art', 'source', 'goblin_1.png')
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), '..', 'public', 'skins', 'png')
NAMES = ['e_goblin_walk1', 'e_goblin_walk2', 'e_goblin_stab1', 'e_goblin_stab2']   # 왼쪽 위, 오른쪽 위, 왼쪽 아래, 오른쪽 아래
BODY_H = 72        # 걷기1 프레임에서 몸 높이(2배 해상도 기준). 화면에서는 36px (늑대 44x32, 오크 44x44 같은 벡터 적과 비슷한 크기)
PAD = 8


def cut(img: Image.Image) -> list[Image.Image]:
    W, H = img.size
    cells = [(0, 0), (W // 2, 0), (0, H // 2), (W // 2, H // 2)]
    frames = []
    for (x0, y0) in cells:
        cell = np.array(img.crop((x0, y0, x0 + W // 2, y0 + H // 2)).convert('RGB'))
        a = keyed_alpha(cell)
        keep = dilate(largest_component(a > 0.5), 2)          # 글자와 효과선은 다른 덩어리라 여기서 사라진다
        a = a * keep
        rgb = despill(cell, a)
        rgba = np.dstack([rgb, a * 255.0]).astype(np.uint8)
        frames.append(Image.fromarray(rgba, 'RGBA'))
    return frames


def main():
    img = Image.open(SRC)
    frames = cut(img)
    boxes = [f.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox() for f in frames]
    frames = [f.crop(b) for f, b in zip(frames, boxes)]
    scale = BODY_H / frames[0].height                        # 네 장을 같은 비율로 줄여 몸 크기를 맞춘다
    frames = [f.resize((max(1, round(f.width * scale)), max(1, round(f.height * scale))), Image.LANCZOS) for f in frames]

    # 몸 중심(알파 무게중심 x)과 발(아랫변)을 캔버스에서 맞춘다
    cxs = []
    for f in frames:
        a = np.array(f.getchannel('A')).astype(np.float32)
        cxs.append(float((a.sum(axis=0) * np.arange(f.width)).sum() / a.sum()))
    half = max(max(cx, f.width - cx) for f, cx in zip(frames, cxs))
    cw = int(round(half * 2)) + PAD * 2
    ch = max(f.height for f in frames) + PAD * 2
    os.makedirs(OUT, exist_ok=True)
    for name, f, cx in zip(NAMES, frames, cxs):
        canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        canvas.paste(f, (int(round(cw / 2 - cx)), ch - PAD - f.height), f)
        canvas.save(os.path.join(OUT, name + '.png'), optimize=True)
        print(f'{name}.png  {cw}x{ch}  (몸 {f.width}x{f.height})')


if __name__ == '__main__':
    main()
