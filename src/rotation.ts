import { isPositionValid } from "./collision";

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
 * テトロミノを指定方向に回転させる関数
 * @param shape 回転させるテトロミノの形状（正方形の2次元配列）
 * @param direction 回転方向（'clockwise': 時計回り、'counterClockwise': 反時計回り）
 * @returns 回転後のテトロミノの形状
 */
export function rotateShape(
  shape: BlockShape,
  direction: "clockwise" | "counterClockwise"
): BlockShape {
  const n = shape.length;
  const rotated: BlockShape = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  if (direction === "clockwise") {
    // 時計回り：転置してから各行を反転
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        rotated[j][n - 1 - i] = shape[i][j];
      }
    }
  } else {
    // 反時計回り：転置してから各列を反転
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        rotated[n - 1 - j][i] = shape[i][j];
      }
    }
  }

  return rotated;
}

/**
 * テトロミノの回転を試行し、必要に応じてウォールキックを適用する関数
 * @param grid ゲームの盤面グリッド
 * @param shape 現在のテトロミノの形状
 * @param offsetX 現在のX座標オフセット
 * @param offsetY 現在のY座標オフセット
 * @param direction 回転方向
 * @returns 回転結果（回転後の形状、新しい座標、有効性）
 */
export function attemptRotation(
  grid: Grid,
  shape: BlockShape,
  offsetX: number,
  offsetY: number,
  direction: "clockwise" | "counterClockwise"
): { rotated: BlockShape; x: number; y: number; valid: boolean } {
  // テトロミノを回転
  const rotated = rotateShape(shape, direction);

  // 元の位置で回転可能かチェック
  if (isPositionValid(grid, rotated, offsetX, offsetY)) {
    return {
      rotated: rotated,
      x: offsetX,
      y: offsetY,
      valid: true,
    };
  }

  // ウォールキックの試行パターン
  const wallKickOffsets = [1, -1, 2, -2];

  // 各オフセットで回転を試行
  for (const offset of wallKickOffsets) {
    const newX = offsetX + offset;

    if (isPositionValid(grid, rotated, newX, offsetY)) {
      return {
        rotated: rotated,
        x: newX,
        y: offsetY,
        valid: true,
      };
    }
  }

  // 全ての試行が失敗した場合
  return {
    rotated: shape, // 元の形状を返す
    x: offsetX,
    y: offsetY,
    valid: false,
  };
}

/**
 * スーパーローテーションシステム（SRS）のウォールキックデータ
 * テトロミノの種類と回転状態に応じた詳細なキックパターン
 */
const SRS_WALL_KICK_DATA = {
  // I型以外のテトロミノ用
  standard: {
    "0->R": [
      [0, 0],
      [-1, 0],
      [-1, 1],
      [0, -2],
      [-1, -2],
    ],
    "R->0": [
      [0, 0],
      [1, 0],
      [1, -1],
      [0, 2],
      [1, 2],
    ],
    "R->2": [
      [0, 0],
      [1, 0],
      [1, -1],
      [0, 2],
      [1, 2],
    ],
    "2->R": [
      [0, 0],
      [-1, 0],
      [-1, 1],
      [0, -2],
      [-1, -2],
    ],
    "2->L": [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, -2],
      [1, -2],
    ],
    "L->2": [
      [0, 0],
      [-1, 0],
      [-1, -1],
      [0, 2],
      [-1, 2],
    ],
    "L->0": [
      [0, 0],
      [-1, 0],
      [-1, -1],
      [0, 2],
      [-1, 2],
    ],
    "0->L": [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, -2],
      [1, -2],
    ],
  },
  // I型テトロミノ用
  I: {
    "0->R": [
      [0, 0],
      [-2, 0],
      [1, 0],
      [-2, -1],
      [1, 2],
    ],
    "R->0": [
      [0, 0],
      [2, 0],
      [-1, 0],
      [2, 1],
      [-1, -2],
    ],
    "R->2": [
      [0, 0],
      [-1, 0],
      [2, 0],
      [-1, 2],
      [2, -1],
    ],
    "2->R": [
      [0, 0],
      [1, 0],
      [-2, 0],
      [1, -2],
      [-2, 1],
    ],
    "2->L": [
      [0, 0],
      [2, 0],
      [-1, 0],
      [2, 1],
      [-1, -2],
    ],
    "L->2": [
      [0, 0],
      [-2, 0],
      [1, 0],
      [-2, -1],
      [1, 2],
    ],
    "L->0": [
      [0, 0],
      [1, 0],
      [-2, 0],
      [1, -2],
      [-2, 1],
    ],
    "0->L": [
      [0, 0],
      [-1, 0],
      [2, 0],
      [-1, 2],
      [2, -1],
    ],
  },
};

/**
 * SRSルールに基づいた高度な回転試行関数
 * @param grid ゲームの盤面グリッド
 * @param shape 現在のテトロミノの形状
 * @param offsetX 現在のX座標オフセット
 * @param offsetY 現在のY座標オフセット
 * @param direction 回転方向
 * @param currentRotation 現在の回転状態（0: 初期状態、1: 右回転、2: 180度、3: 左回転）
 * @param isIPiece I型テトロミノかどうか
 * @returns 回転結果
 */
export function attemptRotationSRS(
  grid: Grid,
  shape: BlockShape,
  offsetX: number,
  offsetY: number,
  direction: "clockwise" | "counterClockwise",
  currentRotation: number,
  isIPiece: boolean = false
): {
  rotated: BlockShape;
  x: number;
  y: number;
  valid: boolean;
  newRotation: number;
} {
  // テトロミノを回転
  const rotated = rotateShape(shape, direction);

  // 新しい回転状態を計算
  const newRotation =
    direction === "clockwise"
      ? (currentRotation + 1) % 4
      : (currentRotation + 3) % 4;

  // 回転状態の文字列表現
  const rotationStates = ["0", "R", "2", "L"];
  const fromState = rotationStates[currentRotation];
  const toState = rotationStates[newRotation];
  const transitionKey = `${fromState}->${toState}`;

  // 適切なウォールキックデータを選択
  const kickData = isIPiece
    ? SRS_WALL_KICK_DATA.I
    : SRS_WALL_KICK_DATA.standard;
  const kickOffsets = kickData[transitionKey as keyof typeof kickData] || [
    [0, 0],
  ];

  // 各キックパターンを試行
  for (const [kickX, kickY] of kickOffsets) {
    const testX = offsetX + kickX;
    const testY = offsetY + kickY;

    if (isPositionValid(grid, rotated, testX, testY)) {
      return {
        rotated: rotated,
        x: testX,
        y: testY,
        valid: true,
        newRotation: newRotation,
      };
    }
  }

  // 全ての試行が失敗した場合
  return {
    rotated: shape,
    x: offsetX,
    y: offsetY,
    valid: false,
    newRotation: currentRotation,
  };
}

/**
 * 180度回転を実行する関数
 * @param shape テトロミノの形状
 * @returns 180度回転後の形状
 */
export function rotate180(shape: BlockShape): BlockShape {
  // 時計回りに2回回転することで180度回転を実現
  return rotateShape(rotateShape(shape, "clockwise"), "clockwise");
}

/**
 * テトロミノの回転プレビューを取得する関数
 * @param shape 現在のテトロミノの形状
 * @param direction 回転方向
 * @param times 回転回数（デフォルト: 1）
 * @returns 指定回数回転後の形状
 */
export function getRotationPreview(
  shape: BlockShape,
  direction: "clockwise" | "counterClockwise",
  times: number = 1
): BlockShape {
  let result = shape;

  for (let i = 0; i < times; i++) {
    result = rotateShape(result, direction);
  }

  return result;
}

/**
 * テトロミノが回転可能かどうかを簡易的にチェックする関数
 * @param grid ゲームの盤面グリッド
 * @param shape 現在のテトロミノの形状
 * @param offsetX 現在のX座標オフセット
 * @param offsetY 現在のY座標オフセット
 * @returns 少なくとも1方向に回転可能な場合はtrue
 */
export function canRotateAtAll(
  grid: Grid,
  shape: BlockShape,
  offsetX: number,
  offsetY: number
): boolean {
  // 時計回りの回転をチェック
  const clockwiseResult = attemptRotation(
    grid,
    shape,
    offsetX,
    offsetY,
    "clockwise"
  );
  if (clockwiseResult.valid) return true;

  // 反時計回りの回転をチェック
  const counterClockwiseResult = attemptRotation(
    grid,
    shape,
    offsetX,
    offsetY,
    "counterClockwise"
  );
  return counterClockwiseResult.valid;
}
