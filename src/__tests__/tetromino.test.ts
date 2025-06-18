import {
  BlockShape,
  generateTetromino,
  getTetrominoByIndex,
  rotateTetromino,
  getTetrominoBounds,
  getTetrominoName,
  TetrominoType,
  TETROMINO_COLORS,
} from "../tetromino";

describe("tetromino", () => {
  describe("TETROMINO_COLORS", () => {
    test("8色（空セル含む）が定義されていること", () => {
      expect(TETROMINO_COLORS).toHaveLength(8);
    });

    test("各色が正しい16進数カラーコードであること", () => {
      expect(TETROMINO_COLORS[0]).toBe(0x000000); // 空（黒）
      expect(TETROMINO_COLORS[1]).toBe(0x00ffff); // I型（シアン）
      expect(TETROMINO_COLORS[2]).toBe(0xffff00); // O型（黄色）
      expect(TETROMINO_COLORS[3]).toBe(0x800080); // T型（紫）
      expect(TETROMINO_COLORS[4]).toBe(0x00ff00); // S型（緑）
      expect(TETROMINO_COLORS[5]).toBe(0xff0000); // Z型（赤）
      expect(TETROMINO_COLORS[6]).toBe(0x0000ff); // J型（青）
      expect(TETROMINO_COLORS[7]).toBe(0xffa500); // L型（オレンジ）
    });

    test("各色が有効な16進数であること", () => {
      TETROMINO_COLORS.forEach((color, index) => {
        expect(typeof color).toBe("number");
        expect(color).toBeGreaterThanOrEqual(0);
        expect(color).toBeLessThanOrEqual(0xffffff);
      });
    });
  });

  describe("generateTetromino", () => {
    test("有効なテトロミノを返すこと", () => {
      const tetromino = generateTetromino();

      expect(Array.isArray(tetromino)).toBe(true);
      expect(tetromino.length).toBe(4); // 4x4サイズ

      // 各行が配列であることを確認
      tetromino.forEach((row) => {
        expect(Array.isArray(row)).toBe(true);
        expect(row.length).toBe(4); // 4x4サイズ
      });

      // 少なくとも1つの非ゼロ値があることを確認
      const hasNonZero = tetromino.some((row) =>
        row.some((cell) => cell !== 0)
      );
      expect(hasNonZero).toBe(true);
    });

    test("返されたテトロミノが元の配列の参照ではないこと（深いコピー）", () => {
      const tetromino1 = generateTetromino();
      const tetromino2 = generateTetromino();

      // 同じテトロミノが生成された場合でも、別のオブジェクトであること
      expect(tetromino1).not.toBe(tetromino2);

      // 片方を変更しても、もう片方に影響しないこと
      const originalValue = tetromino1[0][0];
      tetromino1[0][0] = 99;

      // generateTetrominoを再度呼び出しても影響を受けないこと
      const tetromino3 = generateTetromino();
      expect(tetromino3[0][0]).not.toBe(99);
    });

    test("複数回実行して異なるテトロミノが生成されること", () => {
      const shapes = new Set<string>();

      // 100回実行して、少なくとも2種類以上のテトロミノが生成されることを確認
      for (let i = 0; i < 100; i++) {
        const tetromino = generateTetromino();
        shapes.add(JSON.stringify(tetromino));
      }

      expect(shapes.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getTetrominoByIndex", () => {
    test("有効なインデックス（0-6）で正しいテトロミノを返すこと", () => {
      // I型のテスト
      const iPiece = getTetrominoByIndex(0);
      expect(iPiece).toEqual([
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ]);

      // O型のテスト
      const oPiece = getTetrominoByIndex(1);
      expect(oPiece).toEqual([
        [0, 0, 0, 0],
        [0, 2, 2, 0],
        [0, 2, 2, 0],
        [0, 0, 0, 0],
      ]);

      // T型のテスト
      const tPiece = getTetrominoByIndex(2);
      expect(tPiece).toEqual([
        [0, 0, 0, 0],
        [0, 3, 0, 0],
        [3, 3, 3, 0],
        [0, 0, 0, 0],
      ]);

      // S型のテスト
      const sPiece = getTetrominoByIndex(3);
      expect(sPiece).toEqual([
        [0, 0, 0, 0],
        [0, 4, 4, 0],
        [4, 4, 0, 0],
        [0, 0, 0, 0],
      ]);

      // Z型のテスト
      const zPiece = getTetrominoByIndex(4);
      expect(zPiece).toEqual([
        [0, 0, 0, 0],
        [5, 5, 0, 0],
        [0, 5, 5, 0],
        [0, 0, 0, 0],
      ]);

      // J型のテスト
      const jPiece = getTetrominoByIndex(5);
      expect(jPiece).toEqual([
        [0, 0, 0, 0],
        [6, 0, 0, 0],
        [6, 6, 6, 0],
        [0, 0, 0, 0],
      ]);

      // L型のテスト
      const lPiece = getTetrominoByIndex(6);
      expect(lPiece).toEqual([
        [0, 0, 0, 0],
        [0, 0, 7, 0],
        [7, 7, 7, 0],
        [0, 0, 0, 0],
      ]);
    });

    test("無効なインデックスでエラーをスローすること", () => {
      expect(() => getTetrominoByIndex(-1)).toThrow(
        "Invalid tetromino index: -1"
      );
      expect(() => getTetrominoByIndex(7)).toThrow(
        "Invalid tetromino index: 7"
      );
      expect(() => getTetrominoByIndex(100)).toThrow(
        "Invalid tetromino index: 100"
      );
    });

    test("返される配列が深いコピーであること", () => {
      const piece1 = getTetrominoByIndex(0);
      const piece2 = getTetrominoByIndex(0);

      // 異なるオブジェクトインスタンスであること
      expect(piece1).not.toBe(piece2);

      // 内容は同じであること
      expect(piece1).toEqual(piece2);

      // 一方を変更しても他方に影響しないこと
      piece1[0][0] = 999;
      expect(piece2[0][0]).toBe(0);
    });
  });

  describe("rotateTetromino", () => {
    test("T型を時計回りに回転させること", () => {
      const originalT = [
        [0, 0, 0, 0],
        [0, 3, 0, 0],
        [3, 3, 3, 0],
        [0, 0, 0, 0],
      ];

      const rotatedT = rotateTetromino(originalT);
      expect(rotatedT).toEqual([
        [0, 3, 0, 0],
        [0, 3, 3, 0],
        [0, 3, 0, 0],
        [0, 0, 0, 0],
      ]);
    });

    test("I型を時計回りに回転させること", () => {
      const originalI = [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];

      const rotatedI = rotateTetromino(originalI);
      expect(rotatedI).toEqual([
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
      ]);
    });

    test("L型を時計回りに回転させること", () => {
      const originalL = [
        [0, 0, 0, 0],
        [0, 0, 7, 0],
        [7, 7, 7, 0],
        [0, 0, 0, 0],
      ];

      const rotatedL = rotateTetromino(originalL);
      expect(rotatedL).toEqual([
        [0, 7, 0, 0],
        [0, 7, 0, 0],
        [0, 7, 7, 0],
        [0, 0, 0, 0],
      ]);
    });

    test("O型を回転させても形状が変わらないこと", () => {
      const originalO = [
        [0, 0, 0, 0],
        [0, 2, 2, 0],
        [0, 2, 2, 0],
        [0, 0, 0, 0],
      ];

      const rotatedO = rotateTetromino(originalO);
      expect(rotatedO).toEqual(originalO);
    });

    test("4回回転で元の形に戻ること", () => {
      const originalShape = getTetrominoByIndex(2); // T型

      let shape = originalShape.map((row) => [...row]);
      for (let i = 0; i < 4; i++) {
        shape = rotateTetromino(shape);
      }

      expect(shape).toEqual(originalShape);
    });
  });

  describe("getTetrominoBounds", () => {
    test("T型の境界を正しく取得すること", () => {
      const tPiece = [
        [0, 0, 0, 0],
        [0, 3, 0, 0],
        [3, 3, 3, 0],
        [0, 0, 0, 0],
      ];

      const bounds = getTetrominoBounds(tPiece);
      expect(bounds).toEqual({
        minRow: 1,
        maxRow: 2,
        minCol: 0,
        maxCol: 2,
      });
    });

    test("I型の境界を正しく取得すること", () => {
      const iPiece = [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];

      const bounds = getTetrominoBounds(iPiece);
      expect(bounds).toEqual({
        minRow: 1,
        maxRow: 1,
        minCol: 0,
        maxCol: 3,
      });
    });

    test("O型の境界を正しく取得すること", () => {
      const oPiece = [
        [0, 0, 0, 0],
        [0, 2, 2, 0],
        [0, 2, 2, 0],
        [0, 0, 0, 0],
      ];

      const bounds = getTetrominoBounds(oPiece);
      expect(bounds).toEqual({
        minRow: 1,
        maxRow: 2,
        minCol: 1,
        maxCol: 2,
      });
    });

    test("回転したI型テトロミノの境界を正しく取得すること", () => {
      const rotatedI: BlockShape = [
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
      ];

      const bounds = getTetrominoBounds(rotatedI);

      expect(bounds).toEqual({
        minRow: 0,
        maxRow: 3,
        minCol: 2,
        maxCol: 2,
      });
    });

    test("空の配列の場合の境界", () => {
      const emptyShape: BlockShape = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];

      const bounds = getTetrominoBounds(emptyShape);

      expect(bounds.minRow).toBe(4); // shape.length
      expect(bounds.maxRow).toBe(-1);
      expect(bounds.minCol).toBe(4); // shape[0].length
      expect(bounds.maxCol).toBe(-1);
    });
  });

  describe("TetrominoType", () => {
    test("全てのテトロミノタイプが定義されていること", () => {
      expect(TetrominoType.I).toBe(0);
      expect(TetrominoType.O).toBe(1);
      expect(TetrominoType.T).toBe(2);
      expect(TetrominoType.S).toBe(3);
      expect(TetrominoType.Z).toBe(4);
      expect(TetrominoType.J).toBe(5);
      expect(TetrominoType.L).toBe(6);
    });
  });

  describe("getTetrominoName", () => {
    test("各テトロミノタイプの正しい名前を返すこと", () => {
      expect(getTetrominoName(TetrominoType.I)).toBe("I");
      expect(getTetrominoName(TetrominoType.O)).toBe("O");
      expect(getTetrominoName(TetrominoType.T)).toBe("T");
      expect(getTetrominoName(TetrominoType.S)).toBe("S");
      expect(getTetrominoName(TetrominoType.Z)).toBe("Z");
      expect(getTetrominoName(TetrominoType.J)).toBe("J");
      expect(getTetrominoName(TetrominoType.L)).toBe("L");
    });

    test("無効なタイプの場合はUnknownを返すこと", () => {
      expect(getTetrominoName(7 as TetrominoType)).toBe("Unknown");
      expect(getTetrominoName(-1 as TetrominoType)).toBe("Unknown");
      expect(getTetrominoName(100 as TetrominoType)).toBe("Unknown");
    });
  });

  describe("テトロミノの形状検証", () => {
    test("全てのテトロミノが4x4サイズであること", () => {
      for (let i = 0; i < 7; i++) {
        const tetromino = getTetrominoByIndex(i);
        expect(tetromino).toHaveLength(4);
        tetromino.forEach((row) => {
          expect(row).toHaveLength(4);
        });
      }
    });

    test("全てのテトロミノが正しい数値を持っていること", () => {
      for (let i = 0; i < 7; i++) {
        const tetromino = getTetrominoByIndex(i);
        const expectedValue = i + 1;

        // 各テトロミノが自身の値（1-7）のみを持つことを確認
        const values = new Set<number>();
        tetromino.forEach((row) => {
          row.forEach((cell) => {
            values.add(cell);
          });
        });

        // 自身の値を持つこと
        expect(values.has(expectedValue)).toBe(true);

        // 全てのテトロミノは0（空セル）を含む（4x4なので）
        expect(values.has(0)).toBe(true);
        expect(values.size).toBe(2); // 0と自身の値のみ
      }
    });

    test("各テトロミノが正しいブロック数を持っていること", () => {
      const expectedBlockCounts = [4, 4, 4, 4, 4, 4, 4]; // 全てのテトロミノは4ブロック

      for (let i = 0; i < 7; i++) {
        const tetromino = getTetrominoByIndex(i);
        let blockCount = 0;

        tetromino.forEach((row) => {
          row.forEach((cell) => {
            if (cell !== 0) blockCount++;
          });
        });

        expect(blockCount).toBe(expectedBlockCounts[i]);
      }
    });
  });
});
