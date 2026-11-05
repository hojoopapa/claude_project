"""
스프라이트 시트 처리 공용 함수 (scripts/slice-*.py 가 가져다 쓴다).
이미지 생성 AI 가 만든 자홍색(#FF00FF 계열) 배경 시트에서 그림만 깨끗하게 뽑아낸다.
"""
import numpy as np


def keyed_alpha(rgb: np.ndarray) -> np.ndarray:
    """자홍색일수록 투명. 자홍도 = min(R-G, B-G): 초록, 갈색, 검정, 흰색은 낮고 자홍은 높다."""
    r, g, b = [rgb[..., i].astype(np.float32) for i in range(3)]
    m = np.minimum(r - g, b - g)
    return 1.0 - np.clip((m - 40.0) / 70.0, 0.0, 1.0)


def despill(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """반투명 가장자리에 남은 자홍색 기운을 뺀다."""
    out = rgb.astype(np.float32)
    spill = np.maximum(0.0, np.minimum(out[..., 0], out[..., 2]) - out[..., 1])
    edge = (alpha < 0.999).astype(np.float32)
    out[..., 0] -= spill * edge * 0.9
    out[..., 2] -= spill * edge * 0.9
    return np.clip(out, 0, 255)


def largest_component(mask: np.ndarray) -> np.ndarray:
    """4방향 연결 덩어리 중 가장 큰 것만 True 로 돌려준다 (순수 파이썬 BFS, 칸 하나 크기라 충분히 빠르다)."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    best, best_n = None, 0
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]:
            continue
        stack, comp = [(y0, x0)], []
        seen[y0, x0] = True
        while stack:
            y, x = stack.pop()
            comp.append((y, x))
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        if len(comp) > best_n:
            best, best_n = comp, len(comp)
    out = np.zeros_like(mask, dtype=bool)
    for y, x in best:
        out[y, x] = True
    return out


def dilate(mask: np.ndarray, n: int) -> np.ndarray:
    out = mask.copy()
    for _ in range(n):
        p = np.pad(out, 1)
        out = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return out
