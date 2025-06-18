/**
 * テトロミノ（テトリスブロック）の形状を表す型
 * 2次元配列で表現され、0は空、1以上はブロックの存在を示す
 */
export type BlockShape = number[][];

/**
 * I型テトロミノ（水色）- 直線型
 * 4x4グリッドで中央配置
 */
const I_PIECE: BlockShape = [
  [0, 0, 0, 0],
  [1, 1, 1, 1],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
];

/**
 * O型テトロミノ（黄色）- 正方形型
 * 4x4グリッドで中央配置（回転時の一貫性のため）
 */
const O_PIECE: BlockShape = [
  [0, 0, 0, 0],
  [0, 2, 2, 0],
  [0, 2, 2, 0],
  [0, 0, 0, 0],
];

/**
 * T型テトロミノ（紫色）- T字型
 * 4x4グリッドで中央配置
 */
const T_PIECE: BlockShape = [
  [0, 0, 0, 0],
  [0, 3, 0, 0],
  [3, 3, 3, 0],
  [0, 0, 0, 0],
];

/**
 * S型テトロミノ（緑色）- S字型
 * 4x4グリッドで中央配置
 */
const S_PIECE: BlockShape = [
  [0, 0, 0, 0],
  [0, 4, 4, 0],
  [4, 4, 0, 0],
  [0, 0, 0, 0],
];

/**
 * Z型テトロミノ（赤色）- Z字型
 * 4x4グリッドで中央配置
 */
const Z_PIECE: BlockShape = [
  [0, 0, 0, 0],
  [5, 5, 0, 0],
  [0, 5, 5, 0],
  [0, 0, 0, 0],
];

/**
 * J型テトロミノ（青色）- J字型
 * 4x4グリッドで中央配置
 */
const J_PIECE: BlockShape = [
  [0, 0, 0, 0],
  [6, 0, 0, 0],
  [6, 6, 6, 0],
  [0, 0, 0, 0],
];

/**
 * L型テトロミノ（オレンジ色）- L字型
 * 4x4グリッドで中央配置
 */
const L_PIECE: BlockShape = [
  [0, 0, 0, 0],
  [0, 0, 7, 0],
  [7, 7, 7, 0],
  [0, 0, 0, 0],
];

/**
 * 全てのテトロミノの配列
 * 全て4x4サイズで統一され、回転処理の一貫性を保つ
 */
const TETROMINOS: BlockShape[] = [
  I_PIECE,
  O_PIECE,
  T_PIECE,
  S_PIECE,
  Z_PIECE,
  J_PIECE,
  L_PIECE,
];

/**
 * テトロミノの色定義（16進数カラーコード）
 * インデックス0は空のセル、1-7が各テトロミノの色に対応
 */
export const TETROMINO_COLORS: number[] = [
  0x000000, // 0: 空（黒）
  0x00ffff, // 1: I型（シアン）
  0xffff00, // 2: O型（黄色）
  0x800080, // 3: T型（紫）
  0x00ff00, // 4: S型（緑）
  0xff0000, // 5: Z型（赤）
  0x0000ff, // 6: J型（青）
  0xffa500, // 7: L型（オレンジ）
];

/**
 * ランダムにテトロミノを生成する関数
 * @returns 7種類のテトロミノからランダムに選ばれた1つのBlockShape
 */
export function generateTetromino(): BlockShape {
  const randomIndex = Math.floor(Math.random() * TETROMINOS.length);
  return TETROMINOS[randomIndex].map((row) => [...row]);
}

/**
 * 指定されたインデックスのテトロミノを取得する関数
 * @param index テトロミノのインデックス（0-6）
 * @returns 指定されたテトロミノのBlockShape（深いコピー）
 */
export function getTetrominoByIndex(index: number): BlockShape {
  if (index < 0 || index >= TETROMINOS.length) {
    throw new Error(
      `Invalid tetromino index: ${index}. Must be between 0 and ${TETROMINOS.length - 1}`
    );
  }
  return TETROMINOS[index].map((row) => [...row]);
}

/**
 * テトロミノを時計回りに90度回転させる関数
 * 全テトロミノが4x4で統一されているため安全に回転できる
 * @param shape 回転させるテトロミノの形状
 * @returns 回転後のテトロミノの形状
 */
export function rotateTetromino(shape: BlockShape): BlockShape {
  const n = shape.length;
  const rotated: BlockShape = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      rotated[j][n - 1 - i] = shape[i][j];
    }
  }

  return rotated;
}

/**
 * テトロミノの実際の境界を取得する関数（余白を除いた実際のサイズ）
 * @param shape テトロミノの形状
 * @returns {minRow, maxRow, minCol, maxCol} 実際のブロックが存在する範囲
 */
export function getTetrominoBounds(shape: BlockShape): {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
} {
  let minRow = shape.length;
  let maxRow = -1;
  let minCol = shape[0]?.length || 0;
  let maxCol = -1;

  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 0) {
        minRow = Math.min(minRow, row);
        maxRow = Math.max(maxRow, row);
        minCol = Math.min(minCol, col);
        maxCol = Math.max(maxCol, col);
      }
    }
  }

  return { minRow, maxRow, minCol, maxCol };
}

/**
 * Super Rotation System (SRS) 準拠の壁キックデータ
 * より正確な回転を実現するため
 */
export const SRS_WALL_KICK_DATA = {
  // 通常のテトロミノ（I以外）
  normal: {
    "0->1": [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: -2 },
      { x: -1, y: -2 },
    ],
    "1->2": [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: -1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
    ],
    "2->3": [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: -2 },
      { x: 1, y: -2 },
    ],
    "3->0": [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: -1, y: -1 },
      { x: 0, y: 2 },
      { x: -1, y: 2 },
    ],
  },
  // I型専用
  I: {
    "0->1": [
      { x: 0, y: 0 },
      { x: -2, y: 0 },
      { x: 1, y: 0 },
      { x: -2, y: -1 },
      { x: 1, y: 2 },
    ],
    "1->2": [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: 2, y: 0 },
      { x: -1, y: 2 },
      { x: 2, y: -1 },
    ],
    "2->3": [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: -1, y: 0 },
      { x: 2, y: 1 },
      { x: -1, y: -2 },
    ],
    "3->0": [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -2, y: 0 },
      { x: 1, y: -2 },
      { x: -2, y: 1 },
    ],
  },
};

/**
 * テトロミノの種類を表す列挙型
 */
export enum TetrominoType {
  I = 0,
  O = 1,
  T = 2,
  S = 3,
  Z = 4,
  J = 5,
  L = 6,
}

/**
 * テトロミノの名前を取得する関数
 * @param type テトロミノの種類
 * @returns テトロミノの名前
 */
export function getTetrominoName(type: TetrominoType): string {
  const names = ["I", "O", "T", "S", "Z", "J", "L"];
  return names[type] || "Unknown";
}
