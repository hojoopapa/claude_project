import Phaser from 'phaser';
import { t } from './i18n';
import { C, button, modal, text } from './ui';

/** 보상형 광고 종류. short = 2X 속도, long = 3X 속도, revive = 패배 후 이어하기 */
export type AdKind = 'short' | 'long' | 'revive';

/**
 * 광고 공급자. 포털(CrazyGames, Poki 등)에 올릴 때는 이 인터페이스만 SDK에 맞게 구현해서
 * 아래 `ads` 를 바꿔 끼운다.
 */
export interface AdProvider {
  /** 보상형 광고. 끝까지 봤으면 true, 중간에 닫았거나 실패했으면 false. */
  show(scene: Phaser.Scene, kind: AdKind): Promise<boolean>;
  /**
   * 스테이지 사이에 끼우는 전면 광고 자리 (결과 화면에서 다음 스테이지/다시 하기/스테이지 선택으로 넘어가기 직전).
   * 광고 노출 빈도는 공급자(포털 SDK)가 정한다. 광고가 끝나거나 없으면 바로 resolve 해야 한다.
   */
  interstitial(scene: Phaser.Scene): Promise<void>;
}

/** 테스트용 모의 광고 길이(초). 주소에 ?adsec=3 을 붙이면 모두 그 값으로 줄어든다 */
const MOCK_SECONDS: Record<AdKind, number> = { short: 5, long: 15, revive: 10 };

function adSeconds(kind: AdKind): number {
  const v = Number(new URLSearchParams(location.search).get('adsec'));
  return Number.isFinite(v) && v > 0 ? v : MOCK_SECONDS[kind];
}

/** 카운트다운만 보여주는 모의 광고창 */
const mockProvider: AdProvider = {
  show(scene, kind) {
    return new Promise<boolean>((resolve) => {
      const m = modal(scene, 560, 300, 4000);
      const ui = m.objects;
      let left = adSeconds(kind);
      const title = text(scene, m.cx, m.cy - 100, t('adTitle'), 24, C.gold).setDepth(4002);
      const body = text(scene, m.cx, m.cy - 20, '', 20, C.text).setDepth(4002).setAlign('center');
      const done = (ok: boolean) => { timer.remove(); ui.forEach((o) => o.destroy()); resolve(ok); };
      const cancel = button(scene, m.cx, m.cy + 100, 170, 46, t('cancel'), () => done(false), C.slate, 17);
      const claim = button(scene, m.cx, m.cy + 100, 170, 46, t('adClaim'), () => done(true), C.green, 18);
      cancel.bg.setDepth(4002); claim.bg.setDepth(4002);
      claim.setVisible(false);
      const refresh = () => {
        body.setText(left > 0 ? t('adWait', { n: left }) : t('adDone'));
        if (left <= 0) { cancel.setVisible(false); claim.setVisible(true); }
      };
      const timer = scene.time.addEvent({ delay: 1000, loop: true, callback: () => { left = Math.max(0, left - 1); refresh(); } });
      refresh();
      ui.push(title, body, cancel.bg, claim.bg);
    });
  },
  // 모의 구현은 전면 광고를 보여주지 않는다 (공개 테스트 빌드에서 가짜 광고로 방해하지 않기 위해)
  interstitial: () => Promise.resolve(),
};

export const ads: AdProvider = mockProvider;
