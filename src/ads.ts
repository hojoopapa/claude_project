import { t } from './i18n';

// 광고 제공자 추상화. 실제 SDK(CrazyGames, Poki, AdSense for Games 등)는 이 인터페이스만 구현해서 교체한다.
export interface AdProvider {
  showRewarded(reason: string): Promise<boolean>;
}

/** 테스트용 광고 길이(초). 기본 30초, 빌드할 때 VITE_AD_SECONDS 로, 실행할 때 주소에 ?adsec=3 으로 바꿀 수 있다. */
const AD_SECONDS = (() => {
  const params = new URLSearchParams(location.search);
  const raw = params.has('adsec') ? params.get('adsec') : import.meta.env.VITE_AD_SECONDS;
  const v = Number(raw);
  return raw !== null && raw !== undefined && raw !== '' && Number.isFinite(v) && v >= 0 ? v : 30;
})();

class MockAds implements AdProvider {
  showRewarded(reason: string): Promise<boolean> {
    const el = document.getElementById('ad-overlay')!;
    return new Promise((resolve) => {
      let left = AD_SECONDS;
      const render = () => {
        el.innerHTML = `<div>${t('adTest', { reason })}</div><div style="font-size:44px">${left > 0 ? left : t('adDone')}</div>` +
          `<button id="ad-close">${left > 0 ? t('adSkip') : t('adClaim')}</button>`;
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
