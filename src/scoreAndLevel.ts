/**
 * テトリスのグリッドを表す2次元配列型
 * 0は空、1以上はブロックが存在することを示す
 */
type Grid = number[][];

/**
 * スコアとレベル管理の設定インターフェース
 */
interface ScoreConfig {
  /** 初期スコア */
  initialScore: number;
  /** 消去行数に対する加算スコアのマッピング */
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
   * @param config - スコアとレベル管理の設定
   */
  constructor(private config: ScoreConfig) {
    this.score = config.initialScore;
    this.level = config.initialLevel;
    this.totalLinesCleared = 0;
  }

  /**
   * 行消去時に呼び出し、スコアとレベルを更新
   * @param count - 消去した行数
   */
  public clearLines(count: number): void {
    // スコアを加算
    if (this.config.scoreTable[count] !== undefined) {
      this.score += this.config.scoreTable[count];
    }

    // 累計消去行数を更新
    this.totalLinesCleared += count;

    // レベルを計算
    this.level =
      this.config.initialLevel +
      Math.floor(this.totalLinesCleared / this.config.linesPerLevel);
  }

  /**
   * 現在の落下間隔を計算して返す
   * レベルが上がるごとに10%ずつ速くなる
   * @returns 現在のレベルに応じた落下間隔（ミリ秒）
   */
  public getDropInterval(): number {
    return this.config.baseDropInterval * Math.pow(0.9, this.level - 1);
  }
}

// 型エクスポート
export type { Grid, ScoreConfig };
