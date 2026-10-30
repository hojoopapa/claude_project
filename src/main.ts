import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { GameScene } from './scenes/GameScene';
import { GAME_W, GAME_H } from './config';

// 글꼴을 잠깐(최대 1.2초) 기다렸다가 시작한다. 못 불러와도(오프라인 등) 시스템 글꼴로 계속 진행한다.
const fontReady = Promise.race([
  Promise.all([document.fonts.load('600 16px "Noto Sans KR"'), document.fonts.load('700 16px "Noto Sans KR"')]).catch(() => undefined),
  new Promise((r) => setTimeout(r, 1200)),
]);

await fontReady;
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#14121f',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  disableContextMenu: true,
  scene: [BootScene, MenuScene, LevelSelectScene, GameScene],
});

if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;
