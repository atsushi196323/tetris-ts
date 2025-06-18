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
 * テトロミノ固定化の結果を表すインターフェース
 */
export interface LockResult {
  /** 消去された行数 */
  linesCleared: number;
}

/**
 * グリッドの幅（列数）
 */
const GRID_WIDTH = 10;

/**
 * グリッドの高さ（行数）
 */
const GRID_HEIGHT = 20;

/**
 * テトロミノをグリッドに固定し、完成した行を消去する関数
 * @param grid ゲームの盤面グリッド（直接変更される）
 * @param shape 固定するテトロミノの形状
 * @param offsetX グリッド上のX座標オフセット
 * @param offsetY グリッド上のY座標オフセット
 * @returns 固定化の結果（消去された行数）
 */
export function lockPiece(
  grid: Grid,
  shape: BlockShape,
  offsetX: number,
  offsetY: number
): LockResult {
  // 1. テトロミノをグリッドに固定化（マージ）
  for (let shapeY = 0; shapeY < shape.length; shapeY++) {
    for (let shapeX = 0; shapeX < shape[shapeY].length; shapeX++) {
      const cellValue = shape[shapeY][shapeX];

      // ブロックがある場合のみグリッドに配置
      if (cellValue !== 0) {
        const gridX = offsetX + shapeX;
        const gridY = offsetY + shapeY;

        // グリッドの範囲内かチェック
        if (
          gridY >= 0 &&
          gridY < GRID_HEIGHT &&
          gridX >= 0 &&
          gridX < GRID_WIDTH
        ) {
          grid[gridY][gridX] = cellValue;
        }
      }
    }
  }

  // 2. 完成した行を消去
  const linesCleared = clearLines(grid);

  return {
    linesCleared: linesCleared,
  };
}

/**
 * グリッド内の完成した行を全て消去する関数
 * @param grid ゲームの盤面グリッド（直接変更される）
 * @returns 消去した行数
 */
export function clearLines(grid: Grid): number {
  let clearedCount = 0;

  // 下から上に向かって行をチェック（削除時のインデックスずれを防ぐため）
  for (let row = GRID_HEIGHT - 1; row >= 0; row--) {
    // 現在の行が完全に埋まっているかチェック
    const isRowComplete = grid[row].every((cell) => cell !== 0);

    if (isRowComplete) {
      // 行を削除
      grid.splice(row, 1);

      // 最上部に空の行を追加
      const emptyRow = new Array(GRID_WIDTH).fill(0);
      grid.unshift(emptyRow);

      // 削除したので同じインデックスを再チェックするためにインクリメント
      row++;

      // カウンターをインクリメント
      clearedCount++;
    }
  }

  return clearedCount;
}

/**
 * 複数の行を一度に消去する高速版関数
 * @param grid ゲームの盤面グリッド（直接変更される）
 * @returns 消去した行数
 */
export function clearLinesOptimized(grid: Grid): number {
  const completedRows: number[] = [];

  // 完成した行を全て検出
  for (let row = 0; row < GRID_HEIGHT; row++) {
    if (grid[row].every((cell) => cell !== 0)) {
      completedRows.push(row);
    }
  }

  // 完成した行がない場合は早期リターン
  if (completedRows.length === 0) {
    return 0;
  }

  // 完成していない行のみを抽出
  const remainingRows: number[][] = [];
  for (let row = 0; row < GRID_HEIGHT; row++) {
    if (!completedRows.includes(row)) {
      remainingRows.push([...grid[row]]);
    }
  }

  // グリッドを再構築
  grid.length = 0; // 配列をクリア

  // 消去した行数分の空行を上部に追加
  for (let i = 0; i < completedRows.length; i++) {
    grid.push(new Array(GRID_WIDTH).fill(0));
  }

  // 残った行を追加
  grid.push(...remainingRows);

  return completedRows.length;
}

/**
 * 特定の行が完成しているかチェックする関数
 * @param grid ゲームの盤面グリッド
 * @param rowIndex チェックする行のインデックス
 * @returns 行が完成している場合はtrue
 */
export function isRowComplete(grid: Grid, rowIndex: number): boolean {
  if (rowIndex < 0 || rowIndex >= GRID_HEIGHT) {
    return false;
  }

  return grid[rowIndex].every((cell) => cell !== 0);
}

/**
 * 複数行が同時に消去される場合のボーナス計算用関数
 * @param linesCleared 消去された行数
 * @returns スコアボーナスの倍率
 */
export function getLineClearBonus(linesCleared: number): number {
  switch (linesCleared) {
    case 1:
      return 1; // シングル
    case 2:
      return 3; // ダブル
    case 3:
      return 5; // トリプル
    case 4:
      return 8; // テトリス
    default:
      return 0;
  }
}

/**
 * グリッドの特定範囲に完成した行があるかチェックする関数
 * @param grid ゲームの盤面グリッド
 * @param startRow チェック開始行（含む）
 * @param endRow チェック終了行（含む）
 * @returns 完成した行が存在する場合はtrue
 */
export function hasCompletedRowsInRange(
  grid: Grid,
  startRow: number,
  endRow: number
): boolean {
  const start = Math.max(0, startRow);
  const end = Math.min(GRID_HEIGHT - 1, endRow);

  for (let row = start; row <= end; row++) {
    if (isRowComplete(grid, row)) {
      return true;
    }
  }

  return false;
}

/**
 * 行消去のアニメーション用に完成した行のインデックスを取得する関数
 * @param grid ゲームの盤面グリッド
 * @returns 完成した行のインデックスの配列
 */
export function getCompletedRows(grid: Grid): number[] {
  const completedRows: number[] = [];

  for (let row = 0; row < GRID_HEIGHT; row++) {
    if (isRowComplete(grid, row)) {
      completedRows.push(row);
    }
  }

  return completedRows;
}

/**
 * グリッドのデバッグ表示用関数
 * @param grid ゲームの盤面グリッド
 * @returns グリッドの文字列表現
 */
export function gridToString(grid: Grid): string {
  return grid
    .map((row) =>
      row.map((cell) => (cell === 0 ? "." : cell.toString())).join(" ")
    )
    .join("\n");
}
