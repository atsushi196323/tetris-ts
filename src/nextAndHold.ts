/**
 * テトリミノの種類を表す列挙型
 */
export enum TetrominoType {
  I = "I",
  O = "O",
  T = "T",
  S = "S",
  Z = "Z",
  J = "J",
  L = "L",
}

/**
 * ネクストピースとホールド機能の設定インターフェース
 */
export interface NextHoldConfig {
  /** 表示する次のピースの数 */
  nextQueueSize: number;
  /** ホールド機能を有効にするかどうか */
  enableHold: boolean;
  /** 初期のピース生成に使用するシード（オプション） */
  seed?: number;
}

/**
 * 7-bag方式でのピース生成を管理するクラス
 * 7種類のテトリミノを1セットとして、ランダムな順序で生成
 */
export class PieceBag {
  private bag: TetrominoType[] = [];
  private readonly pieces: TetrominoType[] = [
    TetrominoType.I,
    TetrominoType.O,
    TetrominoType.T,
    TetrominoType.S,
    TetrominoType.Z,
    TetrominoType.J,
    TetrominoType.L,
  ];

  /**
   * 新しいバッグを生成し、シャッフルする
   */
  private refillBag(): void {
    this.bag = [...this.pieces];
    // Fisher-Yatesアルゴリズムでシャッフル
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
  }

  /**
   * 次のピースを取得する
   * @returns 次のテトリミノタイプ
   */
  public getNext(): TetrominoType {
    if (this.bag.length === 0) {
      this.refillBag();
    }
    return this.bag.pop()!;
  }
}

/**
 * テトリスのネクストピース表示とホールド機能を管理するクラス
 */
export class NextHoldManager {
  /** 次のピースのキュー */
  private nextQueue: TetrominoType[] = [];
  /** ホールドされているピース（nullは何もホールドされていない） */
  private heldPiece: TetrominoType | null = null;
  /** 現在のピースでホールドが使用されたかどうか */
  private holdUsedThisTurn: boolean = false;
  /** ピース生成器 */
  private pieceBag: PieceBag;

  /**
   * NextHoldManagerのコンストラクタ
   * @param config - ネクストピースとホールド機能の設定
   */
  constructor(private config: NextHoldConfig) {
    this.pieceBag = new PieceBag();
    this.initializeNextQueue();
  }

  /**
   * ネクストキューを初期化する
   */
  private initializeNextQueue(): void {
    while (this.nextQueue.length < this.config.nextQueueSize) {
      this.nextQueue.push(this.pieceBag.getNext());
    }
  }

  /**
   * 次のピースを取得し、キューを更新する
   * @returns 次のテトリミノタイプ
   */
  public getNextPiece(): TetrominoType {
    const next = this.nextQueue.shift()!;
    this.nextQueue.push(this.pieceBag.getNext());
    this.holdUsedThisTurn = false; // 新しいピースになったのでホールド可能に
    return next;
  }

  /**
   * ネクストキューを取得する（表示用）
   * @returns ネクストキューの配列（変更不可）
   */
  public getNextQueue(): ReadonlyArray<TetrominoType> {
    return [...this.nextQueue];
  }

  /**
   * 現在のピースをホールドし、ホールドされていたピースを返す
   * @param currentPiece - 現在のテトリミノタイプ
   * @returns ホールドから取り出されたピース、または新しいピース
   * @throws ホールド機能が無効、またはこのターンで既にホールドを使用した場合
   */
  public holdPiece(currentPiece: TetrominoType): TetrominoType {
    if (!this.config.enableHold) {
      throw new Error("ホールド機能が無効です");
    }

    if (this.holdUsedThisTurn) {
      throw new Error("このターンでは既にホールドを使用しています");
    }

    this.holdUsedThisTurn = true;

    if (this.heldPiece === null) {
      // 初めてのホールド
      this.heldPiece = currentPiece;
      return this.getNextPiece();
    } else {
      // ホールドピースと交換
      const temp = this.heldPiece;
      this.heldPiece = currentPiece;
      return temp;
    }
  }

  /**
   * ホールドされているピースを取得する（表示用）
   * @returns ホールドされているテトリミノタイプ、またはnull
   */
  public getHeldPiece(): TetrominoType | null {
    return this.heldPiece;
  }

  /**
   * 現在ホールドが可能かどうかを確認する
   * @returns ホールドが可能な場合true
   */
  public canHold(): boolean {
    return this.config.enableHold && !this.holdUsedThisTurn;
  }

  /**
   * ゲームをリセットする
   */
  public reset(): void {
    this.nextQueue = [];
    this.heldPiece = null;
    this.holdUsedThisTurn = false;
    this.pieceBag = new PieceBag();
    this.initializeNextQueue();
  }
}
