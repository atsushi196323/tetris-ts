import * as Phaser from "phaser";
import { TetrominoType } from "../tetromino";

/**
 * ゲームの状態を表す列挙型
 */
export enum GameState {
  MainMenu = "MAIN_MENU",
  Playing = "PLAYING",
  Paused = "PAUSED",
  GameOver = "GAME_OVER",
}

/**
 * UI設定のインターフェース
 */
export interface UIConfig {
  /** フォントファミリー */
  fontFamily: string;
  /** プライマリカラー */
  primaryColor: string;
  /** セカンダリカラー */
  secondaryColor: string;
  /** 背景カラー */
  backgroundColor: string;
  /** テキストカラー */
  textColor: string;
  /** UIパネルの透明度 */
  panelAlpha: number;
  /** ピースプレビューのサイズ */
  previewSize: number;
}

/**
 * ピースの色定義
 */
const PIECE_COLORS: Record<TetrominoType, number> = {
  [TetrominoType.I]: 0x00f0f0,
  [TetrominoType.O]: 0xf0f000,
  [TetrominoType.T]: 0xa000f0,
  [TetrominoType.S]: 0x00f000,
  [TetrominoType.Z]: 0xf00000,
  [TetrominoType.J]: 0x0000f0,
  [TetrominoType.L]: 0xf0a000,
};

/**
 * テトリスのUI/HUDを管理するクラス
 */
export class GameUI {
  private scene: Phaser.Scene;
  private config: UIConfig;

  // UI要素
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private linesText!: Phaser.GameObjects.Text;
  private nextPieceContainer!: Phaser.GameObjects.Container;
  private holdPieceContainer!: Phaser.GameObjects.Container;

  // オーバーレイ
  private mainMenuOverlay!: Phaser.GameObjects.Container;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private gameOverOverlay!: Phaser.GameObjects.Container;

  // 現在のゲーム状態
  private currentState: GameState = GameState.MainMenu;

  /**
   * GameUIのコンストラクタ
   * @param scene - Phaser.jsのシーン
   * @param config - UI設定
   */
  constructor(scene: Phaser.Scene, config: UIConfig) {
    this.scene = scene;
    this.config = config;
    this.createUI();
  }


  /**
   * UIを作成する
   */
  private createUI(): void {
    const { width, height } = this.scene.cameras.main;

    // ゲームエリアを考慮したレイアウト（中央にゲーム、両側にUI）
    const gameAreaWidth = width * 0.6;
    const sidebarWidth = width * 0.2;

    // 左側のパネル（スコア情報）
    this.createScorePanel(10, 10, sidebarWidth - 20);

    // 右側のパネル（次ピース、ホールド）
    this.createNextHoldPanel(width - sidebarWidth + 10, 10, sidebarWidth - 20);

    // オーバーレイ画面
    this.createOverlays();

  }

  /**
   * スコアパネルを作成する
   * @param x - X座標
   * @param y - Y座標
   * @param width - パネルの幅
   */
  private createScorePanel(x: number, y: number, width: number): void {
    // 背景パネル
    const panel = this.scene.add.rectangle(
      x,
      y,
      width,
      200,
      Phaser.Display.Color.HexStringToColor(this.config.backgroundColor).color,
      this.config.panelAlpha
    );
    panel.setOrigin(0, 0);
    panel.setStrokeStyle(
      2,
      Phaser.Display.Color.HexStringToColor(this.config.primaryColor).color
    );

    // スコアテキスト
    this.scoreText = this.scene.add.text(x + 10, y + 20, "SCORE\n0", {
      fontFamily: this.config.fontFamily,
      fontSize: "24px",
      color: this.config.textColor,
      align: "left",
    });

    // レベルテキスト
    this.levelText = this.scene.add.text(x + 10, y + 80, "LEVEL\n1", {
      fontFamily: this.config.fontFamily,
      fontSize: "24px",
      color: this.config.textColor,
      align: "left",
    });

    // ライン数テキスト
    this.linesText = this.scene.add.text(x + 10, y + 140, "LINES\n0", {
      fontFamily: this.config.fontFamily,
      fontSize: "24px",
      color: this.config.textColor,
      align: "left",
    });
  }

  /**
   * 次ピース・ホールドパネルを作成する
   * @param x - X座標
   * @param y - Y座標
   * @param width - パネルの幅
   */
  private createNextHoldPanel(x: number, y: number, width: number): void {
    // 次ピースパネル
    const nextPanel = this.scene.add.rectangle(
      x,
      y,
      width,
      300,
      Phaser.Display.Color.HexStringToColor(this.config.backgroundColor).color,
      this.config.panelAlpha
    );
    nextPanel.setOrigin(0, 0);
    nextPanel.setStrokeStyle(
      2,
      Phaser.Display.Color.HexStringToColor(this.config.primaryColor).color
    );

    // 次ピースラベル
    this.scene.add
      .text(x + width / 2, y + 20, "NEXT", {
        fontFamily: this.config.fontFamily,
        fontSize: "20px",
        color: this.config.textColor,
        align: "center",
      })
      .setOrigin(0.5, 0);

    // 次ピースコンテナ
    this.nextPieceContainer = this.scene.add.container(x + width / 2, y + 50);

    // ホールドパネル
    const holdPanel = this.scene.add.rectangle(
      x,
      y + 320,
      width,
      120,
      Phaser.Display.Color.HexStringToColor(this.config.backgroundColor).color,
      this.config.panelAlpha
    );
    holdPanel.setOrigin(0, 0);
    holdPanel.setStrokeStyle(
      2,
      Phaser.Display.Color.HexStringToColor(this.config.primaryColor).color
    );

    // ホールドラベル
    this.scene.add
      .text(x + width / 2, y + 330, "HOLD", {
        fontFamily: this.config.fontFamily,
        fontSize: "20px",
        color: this.config.textColor,
        align: "center",
      })
      .setOrigin(0.5, 0);

    // ホールドピースコンテナ
    this.holdPieceContainer = this.scene.add.container(x + width / 2, y + 380);
  }

  /**
   * オーバーレイ画面を作成する
   */
  private createOverlays(): void {
    const { width, height } = this.scene.cameras.main;

    // メインメニュー - 修正：startGame()を呼び出す
    this.mainMenuOverlay = this.createOverlay("TETRIS", [
      { text: "START", callback: () => this.startGame() }, // ← 修正点
      { text: "SETTINGS", callback: () => {} },
    ]);

    // ポーズ画面 - 修正：resumeGame()を呼び出す
    this.pauseOverlay = this.createOverlay("PAUSED", [
      { text: "RESUME", callback: () => this.resumeGame() }, // ← 修正点
      { text: "RESTART", callback: () => this.restartGame() },
      { text: "QUIT", callback: () => this.goToMainMenu() }, // ← 修正点
    ]);

    // ゲームオーバー画面
    this.gameOverOverlay = this.createOverlay("GAME OVER", [
      { text: "RETRY", callback: () => this.restartGame() },
      { text: "MAIN MENU", callback: () => this.goToMainMenu() }, // ← 修正点
    ]);

    // 初期状態を設定
    this.setState(GameState.MainMenu);
  }

  /**
   * オーバーレイを作成する
   * @param title - タイトル
   * @param buttons - ボタン設定の配列
   * @returns 作成されたオーバーレイコンテナ
   */
  private createOverlay(
    title: string,
    buttons: Array<{ text: string; callback: () => void }>
  ): Phaser.GameObjects.Container {
    const { width, height } = this.scene.cameras.main;
    const container = this.scene.add.container(0, 0);

    // 半透明の背景
    const bg = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      0.7
    );
    container.add(bg);

    // パネル
    const panel = this.scene.add.rectangle(
      width / 2,
      height / 2,
      400,
      300,
      Phaser.Display.Color.HexStringToColor(this.config.backgroundColor).color
    );
    panel.setStrokeStyle(
      3,
      Phaser.Display.Color.HexStringToColor(this.config.primaryColor).color
    );
    container.add(panel);

    // タイトル
    const titleText = this.scene.add
      .text(width / 2, height / 2 - 100, title, {
        fontFamily: this.config.fontFamily,
        fontSize: "36px",
        color: this.config.primaryColor,
        align: "center",
      })
      .setOrigin(0.5);
    container.add(titleText);

    // ボタン
    buttons.forEach((btn, index) => {
      const button = this.createButton(
        width / 2,
        height / 2 - 20 + index * 60,
        btn.text,
        btn.callback
      );
      container.add(button);
    });

    container.setVisible(false);
    return container;
  }

  /**
   * ボタンを作成する
   * @param x - X座標
   * @param y - Y座標
   * @param text - ボタンテキスト
   * @param callback - クリック時のコールバック
   * @returns 作成されたボタンコンテナ
   */
  private createButton(
    x: number,
    y: number,
    text: string,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);

    const bg = this.scene.add.rectangle(
      0,
      0,
      200,
      40,
      Phaser.Display.Color.HexStringToColor(this.config.primaryColor).color
    );
    bg.setInteractive({ useHandCursor: true });

    const label = this.scene.add
      .text(0, 0, text, {
        fontFamily: this.config.fontFamily,
        fontSize: "20px",
        color: "#FFFFFF",
        align: "center",
      })
      .setOrigin(0.5);

    container.add([bg, label]);

    bg.on("pointerover", () => {
      bg.setScale(1.1);
    });

    bg.on("pointerout", () => {
      bg.setScale(1.0);
    });

    bg.on("pointerdown", () => {
      callback();
    });

    return container;
  }

  // ========================================
  // 新しい追加メソッド（重要な修正点）
  // ========================================

  /**
   * ゲームを開始する - 新規追加
   */
  private startGame(): void {
    this.setState(GameState.Playing);

    // GameSceneにゲーム開始イベントを送信
    this.scene.events.emit("gameStart");
  }

  /**
   * ゲームを一時停止する - 新規追加
   */
  private pauseGame(): void {
    this.setState(GameState.Paused);

    // GameSceneにゲーム一時停止イベントを送信
    this.scene.events.emit("gamePause");
  }

  /**
   * ゲームを再開する - 新規追加
   */
  private resumeGame(): void {
    this.setState(GameState.Playing);

    // GameSceneにゲーム再開イベントを送信
    this.scene.events.emit("gameResume");
  }

  /**
   * メインメニューに戻る - 新規追加
   */
  private goToMainMenu(): void {
    this.setState(GameState.MainMenu);

    // GameSceneにゲーム停止イベントを送信
    this.scene.events.emit("gameStop");
  }

  /**
   * ゲームオーバー状態にする - 新規追加
   */
  public gameOver(): void {
    this.setState(GameState.GameOver);
  }

  // ========================================
  // 既存メソッドの修正
  // ========================================

  /**
   * スコア情報を更新する
   * @param score - スコア
   * @param level - レベル
   * @param lines - 消去ライン数
   */
  public updateScore(
    score: number,
    level: number = 1,
    lines: number = 0
  ): void {
    this.scoreText.setText(`SCORE\n${score.toLocaleString()}`);
    this.levelText.setText(`LEVEL\n${level}`);
    this.linesText.setText(`LINES\n${lines}`);
  }

  /**
   * 次のピースを更新する
   * @param pieces - 次のピースの配列
   */
  public updateNextPieces(pieces: TetrominoType[]): void {
    this.nextPieceContainer.removeAll(true);

    pieces.forEach((piece, index) => {
      const y = index * (this.config.previewSize + 10);
      this.drawMiniPiece(this.nextPieceContainer, 0, y, piece);
    });
  }

  /**
   * ホールドピースを更新する
   * @param piece - ホールドされているピース（nullの場合は空）
   */
  public updateHoldPiece(piece: TetrominoType | null): void {
    this.holdPieceContainer.removeAll(true);

    if (piece) {
      this.drawMiniPiece(this.holdPieceContainer, 0, 0, piece);
    }
  }

  /**
   * ミニピースを描画する
   * @param container - 描画先のコンテナ
   * @param x - X座標
   * @param y - Y座標
   * @param type - テトリミノタイプ
   */
  private drawMiniPiece(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    type: TetrominoType
  ): void {
    const blockSize = this.config.previewSize / 4;
    const color = PIECE_COLORS[type];

    // 簡易的なピース形状（実際のゲームでは詳細な形状データを使用）
    const shapes: Record<TetrominoType, number[][]> = {
      [TetrominoType.I]: [[1, 1, 1, 1]],
      [TetrominoType.O]: [
        [1, 1],
        [1, 1],
      ],
      [TetrominoType.T]: [
        [0, 1, 0],
        [1, 1, 1],
      ],
      [TetrominoType.S]: [
        [0, 1, 1],
        [1, 1, 0],
      ],
      [TetrominoType.Z]: [
        [1, 1, 0],
        [0, 1, 1],
      ],
      [TetrominoType.J]: [
        [1, 0, 0],
        [1, 1, 1],
      ],
      [TetrominoType.L]: [
        [0, 0, 1],
        [1, 1, 1],
      ],
    };

    const shape = shapes[type];
    shape.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell) {
          const block = this.scene.add.rectangle(
            x + colIndex * blockSize - blockSize * 1.5,
            y + rowIndex * blockSize - blockSize,
            blockSize - 2,
            blockSize - 2,
            color
          );
          container.add(block);
        }
      });
    });
  }

  /**
   * ゲーム状態を設定する
   * @param state - 新しいゲーム状態
   */
  public setState(state: GameState): void {
    this.currentState = state;

    // すべてのオーバーレイを非表示
    this.mainMenuOverlay.setVisible(false);
    this.pauseOverlay.setVisible(false);
    this.gameOverOverlay.setVisible(false);

    // 状態に応じて表示
    switch (state) {
      case GameState.MainMenu:
        this.mainMenuOverlay.setVisible(true);
        break;
      case GameState.Playing:
        break;
      case GameState.Paused:
        this.pauseOverlay.setVisible(true);
        break;
      case GameState.GameOver:
        this.gameOverOverlay.setVisible(true);
        break;
    }
  }

  /**
   * 現在のゲーム状態を取得する
   * @returns 現在のゲーム状態
   */
  public getState(): GameState {
    return this.currentState;
  }

  /**
   * ゲームをリスタートする - 修正
   */
  private restartGame(): void {

    // ゲームリスタートのイベントを発行
    this.scene.events.emit("gameRestart");
    this.setState(GameState.Playing);
  }

  /**
   * UIを破棄する
   */
  public destroy(): void {
    // コンテナとテキストの破棄
    this.mainMenuOverlay?.destroy();
    this.pauseOverlay?.destroy();
    this.gameOverOverlay?.destroy();
    this.nextPieceContainer?.destroy();
    this.holdPieceContainer?.destroy();
    this.scoreText?.destroy();
    this.levelText?.destroy();
    this.linesText?.destroy();
  }

}

/**
 * デフォルトのUI設定を取得する
 * @returns デフォルトのUI設定
 */
export function getDefaultUIConfig(): UIConfig {
  return {
    fontFamily: "Arial, sans-serif",
    primaryColor: "#00ff00",
    secondaryColor: "#0088ff",
    backgroundColor: "#222222",
    textColor: "#ffffff",
    panelAlpha: 0.8,
    previewSize: 60,
  };
}
