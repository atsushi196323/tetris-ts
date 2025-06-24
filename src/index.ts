import * as Phaser from "phaser";
import { GameScene } from "./GameScene";

// TypeScriptでwindow.gameを使用するための型定義
declare global {
  interface Window {
    game: Phaser.Game;
  }
}

/**
 * Phaserゲームの設定
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: 360,
  height: 640,
  backgroundColor: "#222222",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 360,
    height: 640,
  },
  scene: [GameScene],
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  // オーディオの警告を抑制するオプション
  audio: {
    disableWebAudio: false,
    noAudio: false,
  },
};


// ゲームの作成と開始
const game = new Phaser.Game(config);

window.game = game;


if (game.device.input.touch) {
  game.input.addPointer(2);
}

// ウィンドウのリサイズに対応
window.addEventListener("resize", () => {
  game.scale.refresh();
});


// ページ離脱時のクリーンアップ
window.addEventListener("beforeunload", () => {
  if (game) {
    game.destroy(true);
  }
});

