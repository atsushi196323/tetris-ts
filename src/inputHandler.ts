import * as Phaser from "phaser";

/**
 * テトリスの操作アクションを表す列挙型
 */
export enum TetrisAction {
  MoveLeft = "MOVE_LEFT",
  MoveRight = "MOVE_RIGHT",
  RotateClockwise = "ROTATE_CW",
  RotateCounterClockwise = "ROTATE_CCW",
  SoftDrop = "SOFT_DROP",
  HardDrop = "HARD_DROP",
  Hold = "HOLD",
  Pause = "PAUSE",
}

/**
 * タッチジェスチャーの種類
 */
export enum GestureType {
  Tap = "TAP",
  SwipeLeft = "SWIPE_LEFT",
  SwipeRight = "SWIPE_RIGHT",
  SwipeDown = "SWIPE_DOWN",
  SwipeUp = "SWIPE_UP",
}

/**
 * 入力設定のインターフェース
 */
export interface InputConfig {
  /** キーボードのキーマッピング */
  keyBindings: Record<string, TetrisAction>;
  /** タッチジェスチャーのマッピング */
  gestureBindings: Record<GestureType, TetrisAction>;
  /** DAS（Delayed Auto Shift）の初期遅延（ms） */
  dasDelay: number;
  /** DAS（Delayed Auto Shift）の繰り返し間隔（ms） */
  dasInterval: number;
  /** スワイプを検出する最小距離（ピクセル） */
  swipeThreshold: number;
  /** スワイプを検出する最大時間（ms） */
  swipeTimeout: number;
}

/**
 * アクションのコールバック関数の型
 */
type ActionCallback = () => void;

/**
 * タッチ情報を保持するインターフェース
 */
interface TouchInfo {
  startX: number;
  startY: number;
  startTime: number;
  identifier: number;
}

/**
 * テトリスの入力を管理するクラス
 */
export class InputHandler {
  private scene: Phaser.Scene;
  private actionCallbacks: Map<TetrisAction, ActionCallback> = new Map();
  private dasTimers: Map<TetrisAction, number> = new Map();
  private activeTouch: TouchInfo | null = null;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};

  /**
   * InputHandlerのコンストラクタ
   * @param scene - Phaser.jsのシーン
   * @param config - 入力設定
   */
  constructor(
    scene: Phaser.Scene,
    private config: InputConfig
  ) {
    this.scene = scene;
    this.setupKeyboard();
    this.setupTouch();
  }

  /**
   * キーボード入力の設定
   */
  private setupKeyboard(): void {
    // キーバインディングに基づいてキーを登録
    Object.keys(this.config.keyBindings).forEach((key) => {
      this.keys[key] = this.scene.input.keyboard!.addKey(key);
    });
  }

  /**
   * タッチ入力の設定
   */
  private setupTouch(): void {
    this.scene.input.on("pointerdown", this.handleTouchStart, this);
    this.scene.input.on("pointerup", this.handleTouchEnd, this);
    this.scene.input.on("pointermove", this.handleTouchMove, this);
  }

  /**
   * タッチ開始時の処理
   * @param pointer - Phaserのポインターオブジェクト
   */
  private handleTouchStart(pointer: Phaser.Input.Pointer): void {
    this.activeTouch = {
      startX: pointer.x,
      startY: pointer.y,
      startTime: Date.now(),
      identifier: pointer.id,
    };
  }

  /**
   * タッチ終了時の処理
   * @param pointer - Phaserのポインターオブジェクト
   */
  private handleTouchEnd(pointer: Phaser.Input.Pointer): void {
    if (!this.activeTouch || this.activeTouch.identifier !== pointer.id) {
      return;
    }

    const deltaX = pointer.x - this.activeTouch.startX;
    const deltaY = pointer.y - this.activeTouch.startY;
    const deltaTime = Date.now() - this.activeTouch.startTime;

    const gesture = this.detectGesture(deltaX, deltaY, deltaTime);
    if (gesture !== null) {
      const action = this.config.gestureBindings[gesture];
      if (action) {
        this.triggerAction(action);
      }
    }

    this.activeTouch = null;
  }

  /**
   * タッチ移動時の処理（将来の拡張用）
   * @param pointer - Phaserのポインターオブジェクト
   */
  private handleTouchMove(pointer: Phaser.Input.Pointer): void {
    // 必要に応じて実装（例：ドラッグ操作）
  }

  /**
   * ジェスチャーを検出する
   * @param deltaX - X方向の移動距離
   * @param deltaY - Y方向の移動距離
   * @param deltaTime - 経過時間
   * @returns 検出されたジェスチャー、または null
   */
  private detectGesture(
    deltaX: number,
    deltaY: number,
    deltaTime: number
  ): GestureType | null {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // タイムアウトチェック
    if (deltaTime > this.config.swipeTimeout) {
      return null;
    }

    // タップの検出
    if (
      absX < this.config.swipeThreshold &&
      absY < this.config.swipeThreshold
    ) {
      return GestureType.Tap;
    }

    // スワイプの検出
    if (absX > absY) {
      // 水平スワイプ
      if (absX >= this.config.swipeThreshold) {
        return deltaX > 0 ? GestureType.SwipeRight : GestureType.SwipeLeft;
      }
    } else {
      // 垂直スワイプ
      if (absY >= this.config.swipeThreshold) {
        return deltaY > 0 ? GestureType.SwipeDown : GestureType.SwipeUp;
      }
    }

    return null;
  }

  /**
   * アクションにコールバックを登録する
   * @param action - テトリスアクション
   * @param callback - 実行するコールバック関数
   */
  public on(action: TetrisAction, callback: ActionCallback): void {
    this.actionCallbacks.set(action, callback);
  }

  /**
   * アクションのコールバックを削除する
   * @param action - テトリスアクション
   */
  public off(action: TetrisAction): void {
    this.actionCallbacks.delete(action);
  }

  /**
   * アクションを実行する
   * @param action - テトリスアクション
   */
  private triggerAction(action: TetrisAction): void {
    const callback = this.actionCallbacks.get(action);
    if (callback) {
      callback();
    }
  }

  /**
   * フレームごとの更新処理
   * @param time - 現在の時間
   * @param delta - 前フレームからの経過時間
   */
  public update(time: number, delta: number): void {
    // キーボード入力の処理
    Object.entries(this.config.keyBindings).forEach(([key, action]) => {
      const keyObj = this.keys[key];
      if (!keyObj) return;

      // ハードドロップは繰り返し実行しない
      if (action === TetrisAction.HardDrop) {
        if (Phaser.Input.Keyboard.JustDown(keyObj)) {
          this.triggerAction(action);
        }
        return; // DAS処理をスキップ
      }

      if (Phaser.Input.Keyboard.JustDown(keyObj)) {
        // キーが押された瞬間
        this.triggerAction(action);
        this.dasTimers.set(action, time + this.config.dasDelay);
      } else if (keyObj.isDown) {
        // キーが押し続けられている
        const dasTimer = this.dasTimers.get(action);
        if (dasTimer && time >= dasTimer) {
          this.triggerAction(action);
          this.dasTimers.set(action, time + this.config.dasInterval);
        }
      } else {
        // キーが離された
        this.dasTimers.delete(action);
      }
    });
  }

  /**
   * 入力ハンドラーを破棄する
   */
  public destroy(): void {
    this.scene.input.off("pointerdown", this.handleTouchStart, this);
    this.scene.input.off("pointerup", this.handleTouchEnd, this);
    this.scene.input.off("pointermove", this.handleTouchMove, this);
    this.actionCallbacks.clear();
    this.dasTimers.clear();
  }
}

/**
 * デフォルトの入力設定を取得する
 * @returns デフォルトの入力設定
 */
export function getDefaultInputConfig(): InputConfig {
  return {
    keyBindings: {
      LEFT: TetrisAction.MoveLeft,
      RIGHT: TetrisAction.MoveRight,
      DOWN: TetrisAction.SoftDrop,
      UP: TetrisAction.RotateClockwise,
      Z: TetrisAction.RotateCounterClockwise,
      SPACE: TetrisAction.HardDrop,
      C: TetrisAction.Hold,
      ESC: TetrisAction.Pause,
    },
    gestureBindings: {
      [GestureType.Tap]: TetrisAction.RotateClockwise,
      [GestureType.SwipeLeft]: TetrisAction.MoveLeft,
      [GestureType.SwipeRight]: TetrisAction.MoveRight,
      [GestureType.SwipeDown]: TetrisAction.HardDrop,
      [GestureType.SwipeUp]: TetrisAction.Hold,
    },
    dasDelay: 200,
    dasInterval: 50,
    swipeThreshold: 30,
    swipeTimeout: 300,
  };
}
