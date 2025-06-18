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
  // デバッグ用のコールバック
  callbacks: {
    preBoot: () => {
      console.log("🎮 Phaser: Pre-boot phase");
    },
    postBoot: () => {
      console.log("🎮 Phaser: Post-boot phase - Game is ready!");
    },
  },
};

// デバッグ: Phaserの存在確認
console.log("📦 Phaser version:", Phaser.VERSION);
console.log("📦 Creating game instance...");

// ゲームの作成と開始
const game = new Phaser.Game(config);

// 重要: グローバル変数として公開（デバッグ用）
window.game = game;

// デバッグ: ゲームインスタンスの確認
console.log("✅ Game instance created:", !!game);
console.log("✅ Window.game assigned:", !!window.game);

// シーンの初期化を監視
game.events.once("ready", () => {
  console.log("🎮 Game is ready!");
  console.log(
    "📋 Active scenes:",
    game.scene.getScenes(true).map((s) => s.scene.key)
  );

  // GameSceneが正しく登録されているか確認
  const gameScene = game.scene.getScene("GameScene");
  console.log("🎬 GameScene found:", !!gameScene);
});

// モバイルデバイスでのタッチ操作を有効化
if (game.device.input.touch) {
  game.input.addPointer(2);
  console.log("📱 Touch input enabled");
}

// ウィンドウのリサイズに対応
window.addEventListener("resize", () => {
  game.scale.refresh();
});

// エラーハンドリング
window.addEventListener("error", (event) => {
  console.error("❌ Global error:", event.error);
});

// ページ離脱時のクリーンアップ
window.addEventListener("beforeunload", () => {
  if (game) {
    game.destroy(true);
  }
});

// デバッグ用: 5秒後に状態を確認
setTimeout(() => {
  console.log("🔍 === Game Status Check (5s) ===");
  console.log("Game exists:", !!window.game);
  console.log("Scene manager:", !!window.game?.scene);
  console.log("GameScene active:", window.game?.scene?.isActive("GameScene"));
  console.log("GameScene visible:", window.game?.scene?.isVisible("GameScene"));
  console.log("=================================");
}, 5000);
