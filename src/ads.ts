// 광고 제공자 추상화. 실제 SDK(AdSense for Games, CrazyGames, Poki 등)는 이 인터페이스만 구현해서 교체한다.
export interface AdProvider {
  showRewarded(reason: string): Promise<boolean>;
}

class MockAds implements AdProvider {
  showRewarded(reason: string): Promise<boolean> {
    const el = document.getElementById('ad-overlay')!;
    return new Promise((resolve) => {
      let left = 3;
      const render = () => {
        el.innerHTML = `<div>[테스트 광고] ${reason}</div><div style="font-size:40px">${left > 0 ? left : '완료'}</div>` +
          `<button id="ad-close">${left > 0 ? '건너뛰기 (보상 없음)' : '보상 받기'}</button>`;
        document.getElementById('ad-close')!.onclick = () => finish(left <= 0);
      };
      const finish = (ok: boolean) => {
        clearInterval(timer);
        el.style.display = 'none';
        resolve(ok);
      };
      const timer = setInterval(() => { left--; render(); if (left <= 0) clearInterval(timer); }, 1000);
      el.style.display = 'flex';
      render();
    });
  }
}

export const ads: AdProvider = new MockAds();
