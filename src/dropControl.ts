import * as Phaser from "phaser";
import { isPositionValid, placeTetromino } from "./collision";

/**
 * テトロミノ（テトリスブロック）の形状を表す型
 * 2次元配列で表現され、0は空、1以上はブロックの存在を示す
 */
export type BlockShape = number[][];

/**
 * ゲームの盤面グリッドを表す型
 * 10列×20行の2次元配列で、0は空、1以上は配置済みブロックを示す
 */
export type Grid = number[][];

/**
 * テトロミノの落下制御に必要な設定を定義するインターフェース
 */
export interface DropConfig {
  /** Phaser.Sceneインスタンス */
  scene: Phaser.Scene;
  /** 落下中のテトロミノの形状 */
  shape: BlockShape;
  /** ゲームの盤面グリッド */
  grid: Grid;
  /** テトロミノのX座標オフセット（列位置） */
  offsetX: number;
  /** テトロミノのY座標オフセット（行位置） */
  offsetY: number;
  /** 落下間隔（ミリ秒） */
  dropInterval: number;
}

/**
 * 落下制御の拡張設定インターフェース（オプショナルなコールバック付き）
 */
export interface ExtendedDropConfig extends DropConfig {
  /** テトロミノが固定された時に呼ばれるコールバック */
  onLock?: () => void;
  /** 落下位置が更新された時に呼ばれるコールバック */
  onPositionUpdate?: (x: number, y: number) => void;
}

/**
 * テトロミノの自動落下を開始する関数
 * @param config 落下制御の設定
 * @returns Phaser.Time.TimerEvent - 落下制御用のタイマーイベント
 */
export function startDrop(config: DropConfig): Phaser.Time.TimerEvent {
  // 落下処理を実行する関数
  const dropFunction = () => {
    // Y座標を1増やして落下させる
    config.offsetY++;

    // 新しい位置が有効かチェック
    if (
      isPositionValid(config.grid, config.shape, config.offsetX, config.offsetY)
    ) {
      // 有効な位置の場合、落下を継続
      // ※ここで位置更新のコールバックを呼ぶことも可能
      // if ((config as ExtendedDropConfig).onPositionUpdate) {
      //     (config as ExtendedDropConfig).onPositionUpdate!(config.offsetX, config.offsetY);
      // }
    } else {
      // 衝突した場合、前の位置に戻す
      config.offsetY--;

      // タイマーを停止
      timerEvent.remove();

      // テトロミノをグリッドに固定
      placeTetromino(config.grid, config.shape, config.offsetX, config.offsetY);

      // ※ここで固定化後のコールバック（onLock）を呼ぶ
      // 例：行の完成チェック、新しいテトロミノの生成、ゲームオーバー判定など
      // if ((config as ExtendedDropConfig).onLock) {
      //     (config as ExtendedDropConfig).onLock!();
      // }
    }
  };

  // Phaserのタイマーイベントを作成して落下処理を定期実行
  const timerEvent = config.scene.time.addEvent({
    delay: config.dropInterval,
    callback: dropFunction,
    loop: true,
  });

  return timerEvent;
}

/**
 * 落下制御を一時停止する関数
 * @param timerEvent 一時停止するタイマーイベント
 */
export function pauseDrop(timerEvent: Phaser.Time.TimerEvent): void {
  if (timerEvent && !timerEvent.hasDispatched) {
    timerEvent.paused = true;
  }
}

/**
 * 落下制御を再開する関数
 * @param timerEvent 再開するタイマーイベント
 */
export function resumeDrop(timerEvent: Phaser.Time.TimerEvent): void {
  if (timerEvent && !timerEvent.hasDispatched) {
    timerEvent.paused = false;
  }
}

/**
 * 落下制御を停止する関数
 * @param timerEvent 停止するタイマーイベント
 */
export function stopDrop(timerEvent: Phaser.Time.TimerEvent): void {
  if (timerEvent && !timerEvent.hasDispatched) {
    timerEvent.remove();
  }
}

/**
 * 落下速度を変更する関数
 * @param scene Phaser.Sceneインスタンス
 * @param currentTimer 現在のタイマーイベント
 * @param config 新しい設定
 * @returns 新しいタイマーイベント
 */
export function changeDropSpeed(
  scene: Phaser.Scene,
  currentTimer: Phaser.Time.TimerEvent,
  config: DropConfig
): Phaser.Time.TimerEvent {
  // 現在のタイマーを停止
  stopDrop(currentTimer);

  // 新しい速度でタイマーを再作成
  return startDrop(config);
}

/**
 * ハードドロップ（即座に最下部まで落下）を実行する関数
 * @param config 落下制御の設定
 * @returns 落下した行数
 */
export function hardDrop(config: DropConfig): number {
  let dropDistance = 0;

  // 衝突するまで落下を続ける
  while (
    isPositionValid(
      config.grid,
      config.shape,
      config.offsetX,
      config.offsetY + 1
    )
  ) {
    config.offsetY++;
    dropDistance++;
  }

  // テトロミノを固定
  placeTetromino(config.grid, config.shape, config.offsetX, config.offsetY);

  // ※ここで固定化後のコールバック（onLock）を呼ぶ
  // ハードドロップ後は即座に固定されるため、通常の落下とは別の処理が必要な場合がある

  return dropDistance;
}

/**
 * ソフトドロップ（加速落下）用の設定を作成する関数
 * @param originalConfig 元の設定
 * @param speedMultiplier 速度倍率（デフォルト: 20）
 * @returns ソフトドロップ用の設定
 */
export function createSoftDropConfig(
  originalConfig: DropConfig,
  speedMultiplier: number = 20
): DropConfig {
  return {
    ...originalConfig,
    dropInterval: Math.max(originalConfig.dropInterval / speedMultiplier, 50), // 最小50msに制限
  };
}

/**
 * 落下プレビュー（ゴースト）の位置を計算する関数
 * @param grid ゲームの盤面グリッド
 * @param shape テトロミノの形状
 * @param offsetX 現在のX座標
 * @param offsetY 現在のY座標
 * @returns ゴーストのY座標
 */
export function calculateGhostPosition(
  grid: Grid,
  shape: BlockShape,
  offsetX: number,
  offsetY: number
): number {
  let ghostY = offsetY;

  // 衝突するまで下方向に移動
  while (isPositionValid(grid, shape, offsetX, ghostY + 1)) {
    ghostY++;
  }

  return ghostY;
}
