/**
 * Tetrisのグリッドを表す2次元配列の型エイリアス
 * 0は空きマス、1以上はブロックを表す
 */
type Grid = number[][];

/**
 * スコアとレベルの設定を定義するインターフェース
 */
interface ScoreConfig {
  /** 初期スコア */
  initialScore: number;
  /** 消去行数とそれに対応する加算スコアのマッピング */
  scoreTable: Record<number, number>;
  /** 初期レベル */
  initialLevel: number;
  /** レベルアップに必要な消去行数 */
  linesPerLevel: number;
  /** レベル1の落下間隔（ミリ秒） */
  baseDropInterval: number;
}

/**
 * テトリスのスコアとレベルを管理するクラス
 */
export class ScoreManager {
  /** 現在のスコア */
  public score: number;
  /** 現在のレベル */
  public level: number;
  /** 累計消去行数 */
  public totalLinesCleared: number;

  /**
   * ScoreManagerのコンストラクタ
   * @param config スコアとレベルの設定
   */
  constructor(private config: ScoreConfig) {
    this.score = config.initialScore;
    this.level = config.initialLevel;
    this.totalLinesCleared = 0;
  }

  /**
   * 行消去時に呼び出し、スコアとレベルを更新
   * @param count 消去した行数
   */
  public clearLines(count: number): void {
    // スコアを加算
    const scoreToAdd = this.config.scoreTable[count] || 0;
    this.score += scoreToAdd;

    // 累計消去行数を更新
    this.totalLinesCleared += count;

    // レベルを計算
    this.level =
      this.config.initialLevel +
      Math.floor(this.totalLinesCleared / this.config.linesPerLevel);
  }

  /**
   * 現在の落下間隔を計算して返す
   * レベルが上がるほど落下速度が速くなる
   * @returns 現在のレベルに応じた落下間隔（ミリ秒）
   */
  public getDropInterval(): number {
    return this.config.baseDropInterval * Math.pow(0.9, this.level - 1);
  }
}

/**
 * サウンドエフェクトのタイプ
 */
export enum SoundType {
  /** ブロック回転時の効果音 */
  ROTATE = "rotate",
  /** ブロック移動時の効果音 */
  MOVE = "move",
  /** ブロック着地時の効果音 */
  LAND = "land",
  /** ライン消去時の効果音 */
  CLEAR_LINE = "clearLine",
  /** レベルアップ時の効果音 */
  LEVEL_UP = "levelUp",
  /** ゲームオーバー時の効果音 */
  GAME_OVER = "gameOver",
}

/**
 * サウンド管理クラス
 */
export class SoundManager {
  private sounds: Map<SoundType, Phaser.Sound.BaseSound>;

  /**
   * SoundManagerのコンストラクタ
   * @param scene Phaser.Sceneインスタンス
   */
  constructor(private scene: Phaser.Scene) {
    this.sounds = new Map();
  }

  /**
   * サウンドアセットをロード
   */
  public loadSounds(): void {
    this.scene.load.audio(SoundType.ROTATE, "assets/sounds/rotate.mp3");
    this.scene.load.audio(SoundType.MOVE, "assets/sounds/move.mp3");
    this.scene.load.audio(SoundType.LAND, "assets/sounds/land.mp3");
    this.scene.load.audio(SoundType.CLEAR_LINE, "assets/sounds/clear-line.mp3");
    this.scene.load.audio(SoundType.LEVEL_UP, "assets/sounds/level-up.mp3");
    this.scene.load.audio(SoundType.GAME_OVER, "assets/sounds/game-over.mp3");
  }

  /**
   * サウンドを初期化
   */
  public initSounds(): void {
    Object.values(SoundType).forEach((soundType) => {
      const sound = this.scene.sound.add(soundType, { volume: 0.5 });
      this.sounds.set(soundType, sound);
    });
  }

  /**
   * 指定したサウンドを再生
   * @param soundType 再生するサウンドのタイプ
   */
  public playSound(soundType: SoundType): void {
    const sound = this.sounds.get(soundType);
    if (sound && !sound.isPlaying) {
      sound.play();
    }
  }
}

/**
 * エフェクトアニメーションの設定
 */
interface EffectConfig {
  /** エフェクトの持続時間（ミリ秒） */
  duration: number;
  /** エフェクトの色 */
  color?: number;
  /** エフェクトの強度 */
  intensity?: number;
}

/**
 * ビジュアルエフェクト管理クラス
 */
export class EffectManager {
  /**
   * EffectManagerのコンストラクタ
   * @param scene Phaser.Sceneインスタンス
   */
  constructor(private scene: Phaser.Scene) {}

  /**
   * ライン消去時のエフェクトを再生
   * @param y 消去するラインのY座標
   * @param config エフェクトの設定
   */
  public playLineClearEffect(
    y: number,
    config: EffectConfig = { duration: 500, color: 0xffffff }
  ): void {
    const graphics = this.scene.add.graphics();
    const flashRect = new Phaser.Geom.Rectangle(
      0,
      y * 32,
      this.scene.game.config.width as number,
      32
    );

    graphics.fillStyle(config.color || 0xffffff, 0.8);
    graphics.fillRectShape(flashRect);

    this.scene.tweens.add({
      targets: graphics,
      alpha: { from: 0.8, to: 0 },
      duration: config.duration,
      ease: "Power2",
      onComplete: () => {
        graphics.destroy();
      },
    });

    // パーティクルエフェクトも追加
    const particles = this.scene.add.particles(0, y * 32, "particle", {
      speed: { min: 100, max: 300 },
      scale: { start: 0.5, end: 0 },
      blendMode: "ADD",
      lifespan: 600,
      quantity: 20,
      emitZone: {
        type: "rectangle",
        source: new Phaser.Geom.Rectangle(
          0,
          0,
          this.scene.game.config.width as number,
          32
        ),
        quantity: 20,
      },
    });

    this.scene.time.delayedCall(config.duration, () => {
      particles.destroy();
    });
  }

  /**
   * レベルアップ時のエフェクトを再生
   * @param config エフェクトの設定
   */
  public playLevelUpEffect(
    config: EffectConfig = { duration: 1000, color: 0xffff00 }
  ): void {
    const centerX = (this.scene.game.config.width as number) / 2;
    const centerY = (this.scene.game.config.height as number) / 2;

    // レベルアップテキストを表示
    const levelUpText = this.scene.add.text(centerX, centerY, "LEVEL UP!", {
      fontSize: "48px",
      fontFamily: "Arial",
      color: "#ffff00",
      stroke: "#000000",
      strokeThickness: 4,
    });
    levelUpText.setOrigin(0.5);
    levelUpText.setScale(0);

    // テキストアニメーション
    this.scene.tweens.add({
      targets: levelUpText,
      scale: { from: 0, to: 1.2 },
      duration: 300,
      ease: "Back.easeOut",
      yoyo: true,
      hold: 400,
      onComplete: () => {
        levelUpText.destroy();
      },
    });

    // 画面全体のフラッシュエフェクト
    const flash = this.scene.add.rectangle(
      centerX,
      centerY,
      this.scene.game.config.width as number,
      this.scene.game.config.height as number,
      config.color || 0xffff00,
      0
    );

    this.scene.tweens.add({
      targets: flash,
      alpha: { from: 0, to: 0.3 },
      duration: 200,
      yoyo: true,
      onComplete: () => {
        flash.destroy();
      },
    });
  }

  /**
   * ブロック着地時のエフェクトを再生
   * @param x ブロックのX座標
   * @param y ブロックのY座標
   */
  public playLandEffect(x: number, y: number): void {
    const impact = this.scene.add.sprite(x, y, "impact");
    impact.setScale(0.5);
    impact.setAlpha(0.8);

    this.scene.tweens.add({
      targets: impact,
      scale: { from: 0.5, to: 1.5 },
      alpha: { from: 0.8, to: 0 },
      duration: 300,
      ease: "Power2",
      onComplete: () => {
        impact.destroy();
      },
    });
  }
}

