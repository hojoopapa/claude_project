import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config';
import { LEVELS } from '../data/levels';
import { allBestScores, getPlayer, resetScores, setPlayer, totalScore } from '../save';
import { button, confirmModal, text, icon, panel, C } from '../ui';
import { t } from '../i18n';
import { Entry, cleanName, cleanRoom, clearMine, fetchLevel, fetchTotals, rankingEnabled, submitAll } from '../ranking';
import { promptText } from '../domDialog';
import { fmt } from '../score';

const DIFF_DOT = [0x2fb872, 0x3b78e0, 0xd9484f];
const MEDAL = [0xffd36b, 0xc9d3e3, 0xd9945a];
const ROWS = 10, ROW_H = 28, LIST_Y = 158;

/** 랭킹 화면: 스테이지별 / 전체 합계. 온라인이 꺼져 있으면 내 기록만 보여준다. */
export class RankingScene extends Phaser.Scene {
  private tab = 0;            // 0 = 전체 합계, 1.. = 스테이지 번호
  private list: Phaser.GameObjects.GameObject[] = [];
  private token = 0;          // 느린 응답이 더 최신 탭을 덮어쓰지 않게 한다

  constructor() { super('Ranking'); }

  init(data: { level?: number }) {
    this.tab = data.level ?? 0;
    this.list = [];
  }

  create() {
    this.cameras.main.setBackgroundColor(0x0c1322);
    const bg = this.add.graphics();
    bg.fillStyle(0x3a2d6e, 0.22).fillCircle(820, 80, 260);
    bg.fillStyle(0x1c4a3a, 0.22).fillCircle(120, 520, 280);

    button(this, 44, 44, 52, 40, '', () => this.scene.start('LevelSelect'), C.slate, 16, { icon: 'ic_back', iconScale: 0.7, radius: 12 });
    icon(this, 'ic_trophy', GAME_W / 2 - 86, 44, 1.0);
    text(this, GAME_W / 2 + 6, 44, t('ranking'), 30, C.gold, { weight: '700' });

    const on = rankingEnabled();
    const room = getPlayer().room;
    const g = this.add.graphics();
    panel(g, GAME_W - 200, 28, 176, 32, { r: 16, alpha: 0.85 });
    g.fillStyle(on ? 0x2fb872 : 0x6b7694, 1).fillCircle(GAME_W - 180, 44, 5);
    text(this, GAME_W - 100, 44, on ? `${t('room')}: ${room}` : 'offline', 13, on ? C.text : C.dim, { weight: '500' });

    button(this, 690, 44, 130, 36, t('resetBtn'), () => void this.resetMine(), 0x7a3a3f, 14, { radius: 14 });

    if (!on) { this.offlineView(); return; }
    this.onlineView();
  }

  /** 내 점수 초기화: 이 기기의 최고 점수를 지우고, 온라인 랭킹이 켜져 있으면 내 기록도 지운다 */
  private async resetMine() {
    const ok = await confirmModal(this, { title: t('resetTitle'), body: t('resetBody'), ok: t('resetOk'), cancel: t('cancel'), accent: C.danger, danger: true });
    if (!ok) return;
    resetScores();
    let failed = false;
    if (rankingEnabled()) { try { await clearMine(LEVELS.length); } catch { failed = true; } }
    text(this, GAME_W / 2, 270, failed ? t('resetFail') : t('resetDone'), 20, failed ? C.red : C.gold, { weight: '700', stroke: 5 }).setDepth(50).setWordWrapWidth(620).setAlign('center');
    this.time.delayedCall(failed ? 1800 : 900, () => this.scene.restart({ level: this.tab }));
  }

  // ---------- 온라인 ----------
  private onlineView() {
    const maxTab = LEVELS.length;
    const label = this.add.container(GAME_W / 2, 104);
    const lg = this.add.graphics();
    panel(lg, -150, -17, 300, 34, { r: 17, alpha: 0.9 });
    label.add(lg);
    const labelText = text(this, 0, 0, '', 15, C.text);
    label.add(labelText);
    const setTab = (n: number) => { this.tab = ((n % (maxTab + 1)) + maxTab + 1) % (maxTab + 1); refresh(); };
    const totalBtn = button(this, 126, 104, 150, 34, t('rankTotal'), () => setTab(0), C.slate, 14, { radius: 17 });
    button(this, GAME_W / 2 - 190, 104, 44, 34, '', () => setTab(this.tab - 1), C.slate, 14, { icon: 'ic_back', iconScale: 0.55, radius: 17 });
    button(this, GAME_W / 2 + 190, 104, 44, 34, '', () => setTab(this.tab + 1), C.slate, 14, { icon: 'ic_play', iconScale: 0.55, radius: 17 });

    const lp = this.add.graphics();
    panel(lp, 110, 140, 740, 304, { r: 16, alpha: 0.88 });

    const refresh = () => {
      totalBtn.setSelected(this.tab === 0);
      labelText.setText(this.tab === 0 ? t('rankTotal') : `${t('stageN', { n: this.tab })} · ${t('level.' + this.tab)}`);
      void this.loadTab();
    };
    refresh();

    // 아래: 닉네임, 방 코드, 내 기록 모두 등록
    const p = getPlayer();
    button(this, 235, 486, 230, 38, `${t('nickname')}: ${p.name || '-'}`, () => void this.editName(), C.slate, 14, { icon: 'ic_edit', iconScale: 0.5, radius: 14 });
    button(this, 470, 486, 200, 38, `${t('room')}: ${p.room}`, () => void this.editRoom(), C.slate, 14, { icon: 'ic_edit', iconScale: 0.5, radius: 14 });
    const all = button(this, 725, 486, 240, 38, t('rankAll'), async () => {
      if (!(await this.ensureName())) return;
      all.setEnabled(false);
      try { await submitAll(); all.setLabel(t('rankDone')); void this.loadTab(); } catch { all.setLabel(t('rankFail')); all.setEnabled(true); }
    }, C.orange, 14, { radius: 14 });
  }

  private clearList() { this.list.forEach((o) => o.destroy()); this.list = []; }

  private note(s: string, onClick?: () => void) {
    const tx = text(this, GAME_W / 2, 292, s, 16, C.dim, { weight: '500' }).setWordWrapWidth(600).setAlign('center');
    this.list.push(tx);
    if (onClick) { tx.setInteractive({ useHandCursor: true }); tx.setData('ui', true); tx.on('pointerdown', onClick); }
  }

  private async loadTab() {
    const mine = ++this.token;
    this.clearList();
    this.note(t('rankLoading'));
    try {
      const data = this.tab === 0 ? await fetchTotals(ROWS) : await fetchLevel(this.tab, ROWS);
      if (mine !== this.token) return;
      this.clearList();
      if (!data.length) { this.note(t('rankEmpty')); return; }
      this.rows(data);
    } catch {
      if (mine !== this.token) return;
      this.clearList();
      this.note(t('rankError'), () => void this.loadTab());
    }
  }

  private rows(data: Entry[]) {
    const me = getPlayer().id;
    const total = this.tab === 0;
    data.slice(0, ROWS).forEach((e, i) => {
      const y = LIST_Y + i * ROW_H + ROW_H / 2;
      const isMe = e.id === me;
      const g = this.add.graphics();
      if (isMe) g.fillStyle(0xffd36b, 0.14).fillRoundedRect(122, y - 13, 716, 26, 10);
      if (i < 3) g.fillStyle(MEDAL[i], 1).fillCircle(150, y, 11);
      this.list.push(g);
      this.list.push(text(this, 150, y, `${i + 1}`, 14, i < 3 ? '#1a1030' : C.dim, { shadow: false }));
      const nm = text(this, 184, y, e.name + (isMe ? `  (${t('youMark')})` : ''), 16, isMe ? C.gold : C.text).setOrigin(0, 0.5);
      this.list.push(nm);
      if (total) this.list.push(text(this, 620, y, `${e.n ?? 0}/${LEVELS.length}`, 13, C.dim, { weight: '500' }));
      else this.list.push(this.add.circle(640, y, 5, DIFF_DOT[e.diff] ?? DIFF_DOT[1]));
      this.list.push(text(this, 830, y, fmt(e.score), 17, C.gold, { weight: '700' }).setOrigin(1, 0.5));
    });
  }

  private async ensureName(): Promise<boolean> {
    if (cleanName(getPlayer().name)) return true;
    return this.editName();
  }

  private async editName(): Promise<boolean> {
    const v = await promptText({ title: t('nickname'), hint: t('nameHint'), value: getPlayer().name, maxLen: 12, ok: t('ok'), cancel: t('cancel'), filter: cleanName });
    if (!v) return false;
    setPlayer({ name: v });
    this.scene.restart({ level: this.tab });
    return true;
  }

  private async editRoom() {
    const v = await promptText({ title: t('roomTitle'), hint: t('roomHint'), value: getPlayer().room, maxLen: 16, ok: t('ok'), cancel: t('cancel'), filter: cleanRoom });
    if (!v) return;
    setPlayer({ room: v });
    this.scene.restart({ level: this.tab });
  }

  // ---------- 오프라인: 내 기록 ----------
  private offlineView() {
    text(this, GAME_W / 2, 100, t('rankOff'), 15, C.dim, { weight: '500' });
    const best = allBestScores();
    const lp = this.add.graphics();
    panel(lp, 110, 130, 740, 320, { r: 16, alpha: 0.88 });
    LEVELS.forEach((lv, i) => {
      const col = i < 10 ? 0 : 1, row = i % 10;
      const x0 = 140 + col * 360, y = 154 + row * 29;
      const b = best[lv.id];
      text(this, x0, y, `${lv.id}`, 14, C.dim).setOrigin(0, 0.5);
      text(this, x0 + 30, y, t('level.' + lv.id), 14, b ? C.text : '#56627f', { weight: '500' }).setOrigin(0, 0.5);
      text(this, x0 + 320, y, b ? fmt(b.score) : t('noRecord'), b ? 15 : 12, b ? C.gold : '#56627f', { weight: b ? '700' : '500' }).setOrigin(1, 0.5);
    });
    text(this, GAME_W / 2, GAME_H - 52, `${t('rankTotal')}  ${fmt(totalScore())}`, 26, C.gold, { weight: '700' });
  }
}
