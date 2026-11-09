"""
이미지 생성 AI 시트에서 잘라 둔 투명 PNG(docs/art/source/cut)를 게임용 크기·캔버스로 맞춰 public/skins/png 에 만든다.

  python scripts/fit-sprites.py

cut 폴더 파일은 원본 시트(자홍색 배경)에서 배경, 그림자, 글자를 지우고 컷별로 자른 것이다 (병사.png 오른쪽 3개, t_barracks, t_frost,
t_cannon, e_ogre/orc/golem/shaman/wraith/bat, h_sorc). 이 스크립트가 하는 일:
  - 컷마다 가장 큰 덩어리만 남긴다 (떨어진 반짝이, 글자 조각 제거)
  - 가장자리의 자홍색 번짐을 줄인다
  - 적: 걷기 2장 + 공격 2장을 같은 비율로 줄이고 몸 중심, 발을 같은 캔버스에 맞춘다. 게임은 오른쪽을 보는 그림을 기대하므로 왼쪽을 보는 컷은 뒤집는다
  - 타워/병사: 레벨 세 장을 같은 비율로 줄여 레벨이 오를수록 커 보이게 한다. 타워는 바닥이 이미지 높이의 90% 지점에 오도록 맞춘다
결과는 화면 표시 크기의 2배다 (게임에서 0.5배로 그린다).
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'docs', 'art', 'source', 'cut')
OUT = os.path.join(HERE, '..', 'public', 'skins', 'png')
PAD = 6
FOOT = 0.90

# 적: (원본 접두어, 결과 접두어, 걷기1 몸 높이(2배 해상도), 왼쪽을 보는지, 컷 이름들)
ENEMIES = [
    ('orc', 'e_orc', 70, {'atk1'}, ['walk1', 'walk2', 'atk1', 'atk2']),
    ('shaman', 'e_shaman', 64, True, ['walk1', 'walk2', 'atk1', 'atk2']),
    ('wraith', 'e_wraith', 64, False, ['walk1', 'walk2', 'atk1', 'atk2']),
    ('golem', 'e_golem', 104, False, ['walk1', 'walk2', 'atk1', 'atk2']),
    ('ogre', 'e_ogre', 120, False, ['walk1', 'walk2', 'atk1', 'atk2']),
    ('bat', 'e_bat', 60, False, ['1', '2']),
]
# 타워: (원본 접두어, 결과 접두어, 3레벨 그림의 목표 크기, 기준 변: 'h' 높이 / 'w' 폭)
TOWERS = [
    ('barracks', 't_barracks', 200, 'w'),
    ('frost', 't_frost', 232, 'h'),
    ('cannon', 't_cannon', 224, 'h'),
]
SOLDIER_LV1_H = 56      # 병사 1레벨 키 (화면 28px). 2, 3레벨은 같은 비율로 줄여 더 커 보인다
SORC_H = 84            # 마법사 영웅 키 (화면 42px)


def load(name: str, flip: bool = False, max_x: int | None = None) -> Image.Image:
    im = Image.open(os.path.join(SRC, name + '.png')).convert('RGBA')
    a = np.array(im)
    if max_x is not None:
        a[:, max_x:, 3] = 0
    m = a[..., 3] > 20
    lab, k = ndi.label(ndi.binary_dilation(m, iterations=6))
    sz = ndi.sum(m, lab, range(1, k + 1))
    keep = (lab == int(np.argmax(sz)) + 1) & m
    a[..., 3] = np.where(keep, a[..., 3], 0)
    # 가장자리(바깥 2칸)에서 자홍색 번짐 줄이기
    edge = m & ~ndi.binary_erosion(m, iterations=2)
    rgb = a[..., :3].astype(np.float32)
    spill = np.maximum(0.0, np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1] - 25.0)
    rgb[..., 0] -= spill * edge * 0.9
    rgb[..., 2] -= spill * edge * 0.9
    a[..., :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    im = Image.fromarray(a, 'RGBA')
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox())
    return im.transpose(Image.FLIP_LEFT_RIGHT) if flip else im


def resize(im: Image.Image, s: float) -> Image.Image:
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


def cx_of(im: Image.Image, low_only: bool = False) -> float:
    a = np.array(im.getchannel('A')).astype(np.float32)
    if low_only:
        a = a[int(im.height * 0.8):]
    return float((a.sum(axis=0) * np.arange(im.width)).sum() / a.sum())


def recolor(im: Image.Image) -> Image.Image:
    """색조 170~270도(파랑 계열)이고 채도가 있는 픽셀만 붉은색 쪽(-215도)으로 돌린다. 은색 갑옷, 살색, 갈색은 그대로 둔다."""
    a = np.array(im.convert('RGBA'))
    hsv = np.array(Image.fromarray(a[..., :3]).convert('HSV')).astype(np.float32)
    h, s = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255
    m = (h > 170) & (h < 270) & (s > 0.22) & (a[..., 3] > 0)
    hsv[..., 0] = np.where(m, (h - 215) % 360, h) * 255 / 360
    out = a.copy()
    out[..., :3] = np.array(Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB'))
    return Image.fromarray(out)


def pack(frames: dict, foot_frac: float | None = None, low_only: bool = False):
    """같은 캔버스에 몸 중심은 가운데, 발은 아래(foot_frac 이 있으면 그 높이)로 맞춰 저장한다."""
    cxs = {n: cx_of(f, low_only) for n, f in frames.items()}
    cw = int(round(max(max(cxs[n], f.width - cxs[n]) for n, f in frames.items()) * 2)) + PAD * 2
    hmax = max(f.height for f in frames.values())
    ch = int(round((hmax + PAD) / foot_frac)) if foot_frac else hmax + PAD * 2
    foot = int(round(ch * foot_frac)) if foot_frac else ch - PAD
    os.makedirs(OUT, exist_ok=True)
    for n, f in frames.items():
        canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        canvas.paste(f, (int(round(cw / 2 - cxs[n])), foot - f.height), f)
        canvas.save(os.path.join(OUT, n + '.png'), optimize=True)
        print(f'{n}.png  {cw}x{ch}  (그림 {f.width}x{f.height})')


def main():
    for src, dst, body_h, flip, cuts in ENEMIES:
        ims = {c: load(f'{src}_{c}', flip is True or (isinstance(flip, set) and c in flip)) for c in cuts}
        s = body_h / ims[cuts[0]].height
        pack({f'{dst}_{c}': resize(im, s) for c, im in ims.items()})
    for src, dst, target, side in TOWERS:
        ims = [load(f'{src}_lv{i}') for i in (1, 2, 3)]
        s = target / (ims[2].width if side == 'w' else ims[2].height)
        pack({f'{dst}_{i + 1}': resize(im, s) for i, im in enumerate(ims)}, FOOT, low_only=True)
    sol = [load(f'soldier_lv{i}') for i in (1, 2, 3)]
    s = SOLDIER_LV1_H / sol[0].height
    pack({f'soldier_{i + 1}': resize(im, s) for i, im in enumerate(sol)})
    # 지원군(스펠): 병사 2레벨 그림에서 파란 계열(방패, 옷)만 붉은색으로 바꿔 아군 병영 병사와 구별한다
    ref = Image.open(os.path.join(OUT, 'soldier_2.png'))
    recolor(ref).save(os.path.join(OUT, 'soldier_reinf.png'), optimize=True)
    # 마법사 영웅: 공격 컷은 오른쪽 마법 구체를 빼고 몸만 쓴다 (구체는 게임이 투사체로 따로 쏜다)
    idle, atk = load('sorc_1'), load('sorc_2', max_x=380)
    s = SORC_H / idle.height
    pack({'h_sorc': resize(idle, s), 'h_sorc_atk': resize(atk, s)})


if __name__ == '__main__':
    main()
