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
 * グリッドの幅（列数）
 */
export const GRID_WIDTH = 10;

/**
 * グリッドの高さ（行数）
 */
export const GRID_HEIGHT = 20;

/**
 * 指定した位置にテトロミノを配置できるかを判定する関数
 * @param grid ゲームの盤面グリッド（10×20）
 * @param shape 配置しようとするテトロミノの形状
 * @param offsetX グリッド上のX座標オフセット（左端からの列数）
 * @param offsetY グリッド上のY座標オフセット（上端からの行数）
 * @returns 配置可能な場合はtrue、衝突または範囲外の場合はfalse
 */
export function isPositionValid(
  grid: Grid,
  shape: BlockShape,
  offsetX: number,
  offsetY: number
): boolean {
  // shapeの各セルをチェック
  for (let shapeY = 0; shapeY < shape.length; shapeY++) {
    for (let shapeX = 0; shapeX < shape[shapeY].length; shapeX++) {
      // 現在のセルの値を取得
      const cellValue = shape[shapeY][shapeX];

      // 空のセル（0）はスキップ
      if (cellValue === 0) {
        continue;
      }

      // グリッド上の実際の座標を計算
      const gridX = offsetX + shapeX;
      const gridY = offsetY + shapeY;

      // 左右の境界チェック
      if (gridX < 0 || gridX >= GRID_WIDTH) {
        return false;
      }

      // 上下の境界チェック
      if (gridY < 0 || gridY >= GRID_HEIGHT) {
        return false;
      }

      // 既存ブロックとの衝突チェック
      if (grid[gridY][gridX] !== 0) {
        return false;
      }
    }
  }

  // 全てのチェックをパスした場合は配置可能
  return true;
}

/**
 * テトロミノをグリッドに配置する関数
 * @param grid ゲームの盤面グリッド（変更される）
 * @param shape 配置するテトロミノの形状
 * @param offsetX グリッド上のX座標オフセット
 * @param offsetY グリッド上のY座標オフセット
 * @returns 配置に成功した場合はtrue、失敗した場合はfalse
 */
export function placeTetromino(
  grid: Grid,
  shape: BlockShape,
  offsetX: number,
  offsetY: number
): boolean {
  // まず配置可能かチェック
  if (!isPositionValid(grid, shape, offsetX, offsetY)) {
    return false;
  }

  // テトロミノをグリッドに配置
  for (let shapeY = 0; shapeY < shape.length; shapeY++) {
    for (let shapeX = 0; shapeX < shape[shapeY].length; shapeX++) {
      const cellValue = shape[shapeY][shapeX];

      if (cellValue !== 0) {
        const gridX = offsetX + shapeX;
        const gridY = offsetY + shapeY;
        grid[gridY][gridX] = cellValue;
      }
    }
  }

  return true;
}

/**
 * 完全に埋まった行を検出する関数
 * @param grid ゲームの盤面グリッド
 * @returns 完全に埋まった行のインデックスの配列（上から順）
 */
export function findCompletedRows(grid: Grid): number[] {
  const completedRows: number[] = [];

  for (let row = 0; row < GRID_HEIGHT; row++) {
    // 行の全てのセルが埋まっているかチェック
    const isRowComplete = grid[row].every((cell) => cell !== 0);

    if (isRowComplete) {
      completedRows.push(row);
    }
  }

  return completedRows;
}

/**
 * 指定した行を削除し、上の行を下にシフトする関数
 * @param grid ゲームの盤面グリッド（変更される）
 * @param rowIndices 削除する行のインデックスの配列（降順でソートされている必要がある）
 * @returns 削除した行数
 */
export function removeRows(grid: Grid, rowIndices: number[]): number {
  // 降順にソート（下の行から削除するため）
  const sortedIndices = [...rowIndices].sort((a, b) => b - a);

  for (const rowIndex of sortedIndices) {
    // 指定行より上の全ての行を1つ下にシフト
    for (let row = rowIndex; row > 0; row--) {
      grid[row] = [...grid[row - 1]];
    }

    // 最上行を空にする
    grid[0] = new Array(GRID_WIDTH).fill(0);
  }

  return rowIndices.length;
}

/**
 * テトロミノが下に移動できるかチェックする関数
 * @param grid ゲームの盤面グリッド
 * @param shape テトロミノの形状
 * @param offsetX 現在のX座標オフセット
 * @param offsetY 現在のY座標オフセット
 * @returns 下に移動可能な場合はtrue
 */
export function canMoveDown(
  grid: Grid,
  shape: BlockShape,
  offsetX: number,
  offsetY: number
): boolean {
  return isPositionValid(grid, shape, offsetX, offsetY + 1);
}

/**
 * テトロミノが左に移動できるかチェックする関数
 * @param grid ゲームの盤面グリッド
 * @param shape テトロミノの形状
 * @param offsetX 現在のX座標オフセット
 * @param offsetY 現在のY座標オフセット
 * @returns 左に移動可能な場合はtrue
 */
export function canMoveLeft(
  grid: Grid,
  shape: BlockShape,
  offsetX: number,
  offsetY: number
): boolean {
  return isPositionValid(grid, shape, offsetX - 1, offsetY);
}

/**
 * テトロミノが右に移動できるかチェックする関数
 * @param grid ゲームの盤面グリッド
 * @param shape テトロミノの形状
 * @param offsetX 現在のX座標オフセット
 * @param offsetY 現在のY座標オフセット
 * @returns 右に移動可能な場合はtrue
 */
export function canMoveRight(
  grid: Grid,
  shape: BlockShape,
  offsetX: number,
  offsetY: number
): boolean {
  return isPositionValid(grid, shape, offsetX + 1, offsetY);
}

/**
 * テトロミノが回転できるかチェックする関数
 * @param grid ゲームの盤面グリッド
 * @param rotatedShape 回転後のテトロミノの形状
 * @param offsetX 現在のX座標オフセット
 * @param offsetY 現在のY座標オフセット
 * @returns 回転可能な場合はtrue
 */
export function canRotate(
  grid: Grid,
  rotatedShape: BlockShape,
  offsetX: number,
  offsetY: number
): boolean {
  return isPositionValid(grid, rotatedShape, offsetX, offsetY);
}

/**
 * グリッドが空かどうかチェックする関数
 * @param grid ゲームの盤面グリッド
 * @returns グリッドが完全に空の場合はtrue
 */
export function isGridEmpty(grid: Grid): boolean {
  return grid.every((row) => row.every((cell) => cell === 0));
}

/**
 * グリッドの特定の範囲が空かどうかチェックする関数
 * @param grid ゲームの盤面グリッド
 * @param startRow チェック開始行（含む）
 * @param endRow チェック終了行（含む）
 * @returns 指定範囲が完全に空の場合はtrue
 */
export function isRangeEmpty(
  grid: Grid,
  startRow: number,
  endRow: number
): boolean {
  for (let row = startRow; row <= endRow && row < GRID_HEIGHT; row++) {
    if (!grid[row].every((cell) => cell === 0)) {
      return false;
    }
  }
  return true;
}
