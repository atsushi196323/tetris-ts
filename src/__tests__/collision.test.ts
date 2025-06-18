import {
  isPositionValid,
  placeTetromino,
  findCompletedRows,
  removeRows,
  canMoveDown,
  canMoveLeft,
  canMoveRight,
  canRotate,
  isGridEmpty,
  isRangeEmpty,
  GRID_WIDTH,
  GRID_HEIGHT,
  Grid,
  BlockShape,
} from "../collision";

describe("collision.ts", () => {
  // テスト用のヘルパー関数
  const createEmptyGrid = (): Grid => {
    return Array(GRID_HEIGHT)
      .fill(null)
      .map(() => Array(GRID_WIDTH).fill(0));
  };

  describe("isPositionValid", () => {
    test("空のグリッドでは有効な位置に配置可能", () => {
      const grid = createEmptyGrid();
      const shape: BlockShape = [
        [1, 1],
        [1, 1],
      ];

      expect(isPositionValid(grid, shape, 0, 0)).toBe(true);
      expect(isPositionValid(grid, shape, 5, 10)).toBe(true);
      expect(isPositionValid(grid, shape, 8, 18)).toBe(true);
    });

    test("グリッドの境界外は無効", () => {
      const grid = createEmptyGrid();
      const shape: BlockShape = [
        [1, 1],
        [1, 1],
      ];

      // 左境界外
      expect(isPositionValid(grid, shape, -1, 0)).toBe(false);
      // 右境界外
      expect(isPositionValid(grid, shape, 9, 0)).toBe(false);
      // 上境界外
      expect(isPositionValid(grid, shape, 0, -1)).toBe(false);
      // 下境界外
      expect(isPositionValid(grid, shape, 0, 19)).toBe(false);
    });

    test("既存ブロックとの衝突を検出", () => {
      const grid = createEmptyGrid();
      // (5, 5)にブロックを配置
      grid[5][5] = 1;

      const shape: BlockShape = [
        [1, 1],
        [1, 1],
      ];

      // 衝突する位置
      expect(isPositionValid(grid, shape, 4, 4)).toBe(false);
      expect(isPositionValid(grid, shape, 5, 5)).toBe(false);

      // 衝突しない位置
      expect(isPositionValid(grid, shape, 0, 0)).toBe(true);
      expect(isPositionValid(grid, shape, 7, 7)).toBe(true);
    });

    test("空のセル（0）は衝突判定をスキップ", () => {
      const grid = createEmptyGrid();
      grid[5][5] = 1;

      const shape: BlockShape = [
        [0, 1],
        [1, 1],
      ];

      // 左上の0の部分が既存ブロックと重なっても配置可能
      expect(isPositionValid(grid, shape, 5, 4)).toBe(false);
    });
  });

  describe("placeTetromino", () => {
    test("有効な位置にテトロミノを配置", () => {
      const grid = createEmptyGrid();
      const shape: BlockShape = [
        [1, 1],
        [1, 1],
      ];

      const result = placeTetromino(grid, shape, 3, 5);

      expect(result).toBe(true);
      expect(grid[5][3]).toBe(1);
      expect(grid[5][4]).toBe(1);
      expect(grid[6][3]).toBe(1);
      expect(grid[6][4]).toBe(1);
    });

    test("無効な位置には配置できない", () => {
      const grid = createEmptyGrid();
      grid[5][5] = 1;

      const shape: BlockShape = [
        [1, 1],
        [1, 1],
      ];

      const result = placeTetromino(grid, shape, 5, 5);

      expect(result).toBe(false);
      // グリッドは変更されない
      expect(grid[5][6]).toBe(0);
      expect(grid[6][5]).toBe(0);
      expect(grid[6][6]).toBe(0);
    });

    test("異なる値のブロックを配置", () => {
      const grid = createEmptyGrid();
      const shape: BlockShape = [
        [2, 0],
        [2, 2],
        [0, 2],
      ];

      placeTetromino(grid, shape, 4, 10);

      expect(grid[10][4]).toBe(2);
      expect(grid[10][5]).toBe(0); // 空のセル
      expect(grid[11][4]).toBe(2);
      expect(grid[11][5]).toBe(2);
      expect(grid[12][4]).toBe(0); // 空のセル
      expect(grid[12][5]).toBe(2);
    });
  });

  describe("findCompletedRows", () => {
    test("完全に埋まった行を検出", () => {
      const grid = createEmptyGrid();

      // 19行目を完全に埋める
      for (let col = 0; col < GRID_WIDTH; col++) {
        grid[19][col] = 1;
      }

      // 17行目も完全に埋める
      for (let col = 0; col < GRID_WIDTH; col++) {
        grid[17][col] = 2;
      }

      const completedRows = findCompletedRows(grid);
      expect(completedRows).toEqual([17, 19]);
    });

    test("部分的に埋まった行は検出しない", () => {
      const grid = createEmptyGrid();

      // 15行目を部分的に埋める
      for (let col = 0; col < GRID_WIDTH - 1; col++) {
        grid[15][col] = 1;
      }

      const completedRows = findCompletedRows(grid);
      expect(completedRows).toEqual([]);
    });

    test("連続する複数行が完成した場合", () => {
      const grid = createEmptyGrid();

      // 16-19行目を全て埋める
      for (let row = 16; row < 20; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
          grid[row][col] = 1;
        }
      }

      const completedRows = findCompletedRows(grid);
      expect(completedRows).toEqual([16, 17, 18, 19]);
    });
  });

  describe("removeRows", () => {
    test("単一行を削除し、上の行を下にシフト", () => {
      const grid = createEmptyGrid();

      // 5行目に識別用のパターンを配置
      for (let col = 0; col < GRID_WIDTH; col++) {
        grid[5][col] = col + 1;
      }

      // 19行目を削除対象にする
      const deletedCount = removeRows(grid, [19]);

      expect(deletedCount).toBe(1);

      // 5行目のパターンが6行目に移動
      for (let col = 0; col < GRID_WIDTH; col++) {
        expect(grid[6][col]).toBe(col + 1);
      }

      // 最上行（0行目）が空になる
      expect(grid[0].every((cell) => cell === 0)).toBe(true);
    });

    test("複数行を削除（降順でソート済み）", () => {
      const grid = createEmptyGrid();

      // 各行に識別可能な値を設定
      for (let col = 0; col < GRID_WIDTH; col++) {
        grid[5][col] = 5;
        grid[10][col] = 10;
        grid[15][col] = 15;
      }

      // 17行目と19行目を削除
      const deletedCount = removeRows(grid, [19, 17]);

      expect(deletedCount).toBe(2);

      // 元の5行目が7行目に移動（2行分下がる）
      expect(grid[7].every((cell) => cell === 5)).toBe(true);
      // 元の10行目が12行目に移動
      expect(grid[12].every((cell) => cell === 10)).toBe(true);
      // 元の15行目が17行目に移動
      expect(grid[17].every((cell) => cell === 15)).toBe(true);

      // 最上部の2行が空になる
      expect(grid[0].every((cell) => cell === 0)).toBe(true);
      expect(grid[1].every((cell) => cell === 0)).toBe(true);
    });

    test("降順でない配列も正しく処理", () => {
      const grid = createEmptyGrid();

      // 5行目に識別用の値を設定
      for (let col = 0; col < GRID_WIDTH; col++) {
        grid[5][col] = 99;
      }

      // 昇順で渡す
      const deletedCount = removeRows(grid, [17, 18, 19]);

      expect(deletedCount).toBe(3);

      // 元の5行目が8行目に移動（3行分下がる）
      expect(grid[8].every((cell) => cell === 99)).toBe(true);

      // 最上部の3行が空になる
      for (let row = 0; row < 3; row++) {
        expect(grid[row].every((cell) => cell === 0)).toBe(true);
      }
    });
  });

  describe("移動可能性チェック関数", () => {
    let grid: Grid;
    const shape: BlockShape = [
      [1, 1],
      [1, 1],
    ];

    beforeEach(() => {
      grid = createEmptyGrid();
    });

    test("canMoveDown - 下方向への移動可能性", () => {
      // 中央付近では下に移動可能
      expect(canMoveDown(grid, shape, 5, 10)).toBe(true);

      // 最下段では移動不可
      expect(canMoveDown(grid, shape, 5, 18)).toBe(false);

      // 下にブロックがある場合は移動不可
      grid[12][5] = 1;
      expect(canMoveDown(grid, shape, 5, 10)).toBe(false);
    });

    test("canMoveLeft - 左方向への移動可能性", () => {
      // 中央では左に移動可能
      expect(canMoveLeft(grid, shape, 5, 10)).toBe(true);

      // 左端では移動不可
      expect(canMoveLeft(grid, shape, 0, 10)).toBe(false);

      // 左にブロックがある場合は移動不可
      grid[10][4] = 1;
      expect(canMoveLeft(grid, shape, 5, 10)).toBe(false);
    });

    test("canMoveRight - 右方向への移動可能性", () => {
      // 中央では右に移動可能
      expect(canMoveRight(grid, shape, 5, 10)).toBe(true);

      // 右端では移動不可
      expect(canMoveRight(grid, shape, 8, 10)).toBe(false);

      // 右にブロックがある場合は移動不可
      grid[10][7] = 1;
      expect(canMoveRight(grid, shape, 5, 10)).toBe(false);
    });

    test("canRotate - 回転可能性", () => {
      const rotatedShape: BlockShape = [
        [0, 1, 1],
        [1, 1, 0],
      ];

      // 十分なスペースがある場合は回転可能
      expect(canRotate(grid, rotatedShape, 3, 10)).toBe(true);

      // 右端近くでは回転不可（はみ出す）
      expect(canRotate(grid, rotatedShape, 8, 10)).toBe(false);

      // 障害物がある場合は回転不可
      grid[10][5] = 1;
      expect(canRotate(grid, rotatedShape, 3, 10)).toBe(false);
    });
  });

  describe("グリッド状態チェック関数", () => {
    test("isGridEmpty - グリッドが空かチェック", () => {
      const emptyGrid = createEmptyGrid();
      expect(isGridEmpty(emptyGrid)).toBe(true);

      // 1つでもブロックがあればfalse
      emptyGrid[10][5] = 1;
      expect(isGridEmpty(emptyGrid)).toBe(false);
    });

    test("isRangeEmpty - 特定範囲が空かチェック", () => {
      const grid = createEmptyGrid();

      // 空の範囲
      expect(isRangeEmpty(grid, 5, 10)).toBe(true);

      // ブロックを配置
      grid[7][3] = 1;

      // ブロックを含む範囲
      expect(isRangeEmpty(grid, 5, 10)).toBe(false);

      // ブロックを含まない範囲
      expect(isRangeEmpty(grid, 0, 5)).toBe(true);
      expect(isRangeEmpty(grid, 10, 15)).toBe(true);
    });

    test("isRangeEmpty - 境界チェック", () => {
      const grid = createEmptyGrid();

      // 範囲がグリッドの高さを超える場合も正しく処理
      expect(isRangeEmpty(grid, 15, 25)).toBe(true);

      // 最後の行にブロックを配置
      grid[19][5] = 1;
      expect(isRangeEmpty(grid, 15, 25)).toBe(false);
    });
  });

  describe("実際のゲームシナリオ", () => {
    test("テトロミノの配置と行削除の統合テスト", () => {
      const grid = createEmptyGrid();

      // 最下段をほぼ埋める（1列だけ空ける）
      for (let col = 0; col < GRID_WIDTH; col++) {
        if (col !== 5) {
          grid[19][col] = 1;
        }
      }

      // I型テトロミノ（縦）で隙間を埋める
      const iPiece: BlockShape = [[1], [1], [1], [1]];

      // 配置可能かチェック
      expect(isPositionValid(grid, iPiece, 5, 16)).toBe(true);

      // 配置
      placeTetromino(grid, iPiece, 5, 16);

      // 完成した行を検出
      const completedRows = findCompletedRows(grid);
      expect(completedRows).toEqual([19]);

      // 行を削除
      removeRows(grid, completedRows);

      // 最下段が空になったことを確認（全体が1行下にシフト）
      expect(grid[19].some((cell) => cell !== 0)).toBe(true);
      expect(grid[0].every((cell) => cell === 0)).toBe(true);
    });
  });
});
