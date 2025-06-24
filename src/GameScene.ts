import * as Phaser from "phaser";
import { GameUI, GameState, getDefaultUIConfig } from "./ui/gameUI";
import {
  generateTetromino,
  BlockShape,
  TetrominoType,
  TETROMINO_COLORS,
  getTetrominoByIndex,
} from "./tetromino";
import { SoundManager, SoundType } from "./assets/sounds/soundAndEffect";


/**
 * ゲーム定数
 */
const GAME_CONFIG = {
  GRID: {
    WIDTH: 10,
    HEIGHT: 20,
    CELL_SIZE: 30,
  },
  TIMING: {
    FALL_DELAY: 1000,
    MESSAGE_DURATION: 2000,
  },
  SCORING: {
    POINTS_PER_LINE: 100,
  },
  COLORS: {
    GRID_LINE: 0x888888,
    GRID_LINE_ALPHA: 0.5,
    GRID_BACKGROUND: 0x000000,
    GRID_BACKGROUND_ALPHA: 0.8,
    GRID_BORDER: 0xffffff,
    MESSAGE_TEXT: "#00ff00",
    MESSAGE_BACKGROUND: "#000000",
  },
} as const;

/**
 * 壁キック用のオフセット定義
 */
const WALL_KICK_OFFSETS = [
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -2, y: 0 },
  { x: 2, y: 0 },
  { x: 0, y: -1 },
] as const;

/**
 * テトリスゲームのメインシーンクラス
 */
export class GameScene extends Phaser.Scene {

  // ゲーム状態
  private gameState = {
    isPlaying: false,
    score: 0,
    level: 1,
    lines: 0,
  };

  // 現在のピース情報
  private currentPiece: {
    blocks: number[][] | null;
    type: TetrominoType | null;
    x: number;
    y: number;
  } = {
    blocks: null,
    type: null,
    x: 0,
    y: 0,
  };

  // グリッド（10列×20行）
  private grid!: number[][];

  // UI要素
  private gameUI!: GameUI;
  private gridGraphics!: Phaser.GameObjects.Graphics;

  // タイマー
  private fallTimer: Phaser.Time.TimerEvent | null = null;

  // 入力
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyboardCallbacks: Array<() => void> = [];
  private isInputLocked: boolean = false;

  constructor() {
    super({ key: "GameScene" });
  }

  private pieceQueue: TetrominoType[] = [];
  private readonly QUEUE_SIZE = 3;

  create(): void {
    this.pieceQueue = [];
    this.initializeGame();
    this.setupUI();
    this.setupInputs();
    this.setupEventListeners();
  }

  update(time: number, delta: number): void {
  }

  destroy(): void {
    this.cleanup();
  }


  private initializeGame(): void {
    this.initializeGrid();
    this.gridGraphics = this.add.graphics();
    this.drawGrid();
  }

  private setupUI(): void {
    const uiConfig = getDefaultUIConfig();
    this.gameUI = new GameUI(this, uiConfig);
  }

  private setupInputs(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  private initializeGrid(): void {
    this.grid = Array(GAME_CONFIG.GRID.HEIGHT)
      .fill(null)
      .map(() => Array(GAME_CONFIG.GRID.WIDTH).fill(0));
  }

  private setupEventListeners(): void {
    const eventHandlers = {
      gameStart: () => this.handleGameStart(),
      gamePause: () => this.handleGamePause(),
      gameResume: () => this.handleGameResume(),
      gameRestart: () => this.handleGameRestart(),
      gameStop: () => this.handleGameStop(),
    };

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      this.events.on(event, handler);
    });
  }


  private generateRandomTetromino(): TetrominoType {
    const pieces: TetrominoType[] = [
      TetrominoType.I,
      TetrominoType.O,
      TetrominoType.T,
      TetrominoType.S,
      TetrominoType.Z,
      TetrominoType.J,
      TetrominoType.L,
    ];

    const randomIndex = Math.floor(Math.random() * pieces.length);
    return pieces[randomIndex];
  }

  private initializePieceQueue(): void {
    this.pieceQueue = [];
    const initialQueueSize = this.QUEUE_SIZE + 1;
    
    while (this.pieceQueue.length < initialQueueSize) {
      const piece = this.generateRandomTetromino();
      this.pieceQueue.push(piece);
    }
  }

  private updateNextDisplay(): void {
    const nextPieces = this.pieceQueue.slice(0, this.QUEUE_SIZE);
    this.gameUI.updateNextPieces(nextPieces);
  }

  private startGameplay(): void {
    if (this.gameState.isPlaying) {
      return;
    }

    this.gameState.isPlaying = true;
    this.resetGameState();
    this.clearGrid();
    this.drawGrid();
    this.initializePieceQueue();
    this.updateNextDisplay();
    this.spawnNewPiece();
    this.startFallTimer();
    this.setupKeyboardControls();

    this.isInputLocked = true;
    this.time.delayedCall(1500, () => {
      this.isInputLocked = false;
    });

    this.showGameStartMessage();
  }

  /**
   * ===================================
   * ピース操作メソッド（安全性強化）
   * ===================================
   */

  private spawnNewPiece(): void {
    if (!this.gameState.isPlaying) {
      return;
    }

    if (this.pieceQueue.length === 0) {
      this.initializePieceQueue();
    }

    // キュー先頭から取り出し
    const pieceType = this.pieceQueue.shift();
    
    if (pieceType === undefined) {
      this.gameOver();
      return;
    }

    // generateTetromino を使用して正しくテトロミノを生成
    let generatedShape: number[][];
    try {
      // pieceTypeは既に数値型なので直接使用
      generatedShape = getTetrominoByIndex(pieceType);

      // 生成されたシェイプが有効かチェック
      if (
        !generatedShape ||
        !Array.isArray(generatedShape) ||
        generatedShape.length === 0
      ) {
        throw new Error(`Invalid shape generated for piece type: ${pieceType}`);
      }
    } catch (error) {
      this.gameOver();
      return;
    }

    // 新規追加＆Next更新
    const newPiece = this.generateRandomTetromino();
    this.pieceQueue.push(newPiece);
    
    this.updateNextDisplay();

    // 現在のピースをセット
    this.currentPiece = {
      blocks: generatedShape,
      type: pieceType,
      x: Math.floor(GAME_CONFIG.GRID.WIDTH / 2) - 2,
      y: 0,
    };

    if (!this.canPlacePiece(this.currentPiece.x, this.currentPiece.y)) {
      this.gameOver();
      return;
    }
    
    this.redrawAll();
  }

  private lockPiece(): void {
    if (
      !this.currentPiece.blocks ||
      this.currentPiece.type === null ||
      this.currentPiece.type === undefined
    ) {
      return;
    }

    // グリッドにピースを固定
    this.currentPiece.blocks.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell !== 0) {
          const gridRow = this.currentPiece.y + rowIndex;
          const gridCol = this.currentPiece.x + colIndex;

          if (this.isValidGridPosition(gridRow, gridCol)) {
            this.grid[gridRow][gridCol] = cell;
          }
        }
      });
    });

    this.checkAndClearLines();

    // ゲームが続行可能な場合のみ新しいピースを生成
    if (this.gameState.isPlaying) {
      this.spawnNewPiece();
    }
  }

  private checkAndClearLines(): void {
    let linesCleared = 0;
    const completedRows: number[] = [];

    // 完成した行を特定
    for (let row = 0; row < GAME_CONFIG.GRID.HEIGHT; row++) {
      if (this.isRowComplete(row)) {
        completedRows.push(row);
      }
    }

    // 下から上に向かって削除
    for (let i = completedRows.length - 1; i >= 0; i--) {
      this.clearLine(completedRows[i]);
      linesCleared++;
    }

    if (linesCleared > 0) {
      this.updateScore(linesCleared);
    }
  }

  private gameOver(): void {
    this.gameState.isPlaying = false;
    this.stopFallTimer();
    this.gameUI.gameOver();
  }

  /**
   * ===================================
   * 既存メソッドの継続...
   * ===================================
   */

  private setupKeyboardControls(): void {
    this.keyboardCallbacks.forEach((callback) => {
      this.input.keyboard!.off("keydown", callback);
    });
    this.keyboardCallbacks = [];

    const keyMappings = {
      LEFT: () => this.handleMove(-1, 0),
      RIGHT: () => this.handleMove(1, 0),
      DOWN: () => this.handleMove(0, 1),
      UP: () => this.handleRotate(),
      SPACE: () => this.handleMove(0, 1),
    };

    Object.entries(keyMappings).forEach(([key, action]) => {
      const callback = () => {
        if (this.gameState.isPlaying && !this.isInputLocked) {
          action();
        }
      };
      this.input.keyboard!.on(`keydown-${key}`, callback);
      this.keyboardCallbacks.push(callback);
    });
  }

  // [他のメソッドは省略 - 必要に応じて同様のデバッグ機能を追加]

  private async handleGameStart(): Promise<void> {
    this.pieceQueue = [];
    this.startGameplay();
  }

  private handleGamePause(): void {
    this.pauseGameplay();
  }

  private handleGameResume(): void {
    this.resumeGameplay();
  }

  private handleGameRestart(): void {
    this.restartGame();
  }

  private handleGameStop(): void {
    this.stopGameplay();
  }

  private pauseGameplay(): void {
    this.gameState.isPlaying = false;

    if (this.fallTimer) {
      this.fallTimer.paused = true;
    }
  }

  private resumeGameplay(): void {
    this.gameState.isPlaying = true;

    if (this.fallTimer) {
      this.fallTimer.paused = false;
    }
  }

  private stopGameplay(): void {
    this.gameState.isPlaying = false;

    this.stopFallTimer();
    this.clearGrid();
    this.drawGrid();
  }

  private restartGame(): void {
    this.stopGameplay();
    this.resetGameState();
    this.gameUI.updateScore(0, 1, 0);
    this.isInputLocked = false;

    this.pieceQueue = [];

    this.startGameplay();
  }

  private resetGameState(): void {
    this.gameState = {
      isPlaying: true,
      score: 0,
      level: 1,
      lines: 0,
    };
  }

  private handleMove(dx: number, dy: number): void {
    this.movePiece(dx, dy);
  }

  private handleRotate(): void {
    this.rotatePiece();
  }

  private handleDrop(): void {
    this.dropPiece();
  }

  private movePiece(dx: number, dy: number): void {
    if (!this.currentPiece.blocks) return;

    const newX = this.currentPiece.x + dx;
    const newY = this.currentPiece.y + dy;

    if (this.canPlacePiece(newX, newY)) {
      this.currentPiece.x = newX;
      this.currentPiece.y = newY;
      this.redrawAll();
    } else if (dy > 0) {
      this.lockPiece();
    }
  }

  private rotatePiece(): void {
    if (!this.currentPiece.blocks) return;

    const originalShape = this.currentPiece.blocks;
    const rotatedShape = this.getRotatedShape(originalShape);

    this.currentPiece.blocks = rotatedShape;

    if (!this.canPlacePiece(this.currentPiece.x, this.currentPiece.y)) {
      if (!this.tryWallKick()) {
        this.currentPiece.blocks = originalShape;
      }
    }

    this.redrawAll();
  }

  private dropPiece(): void {
    if (!this.currentPiece.blocks) return;

    while (this.canPlacePiece(this.currentPiece.x, this.currentPiece.y + 1)) {
      this.currentPiece.y++;
    }

    this.lockPiece();
  }

  private canPlacePiece(x: number, y: number): boolean {
    if (!this.currentPiece.blocks) return false;

    return this.currentPiece.blocks.every((row, rowIndex) => {
      return row.every((cell, colIndex) => {
        if (!cell) return true;

        const gridX = x + colIndex;
        const gridY = y + rowIndex;

        return (
          this.isValidGridPosition(gridY, gridX) &&
          this.grid[gridY][gridX] === 0
        );
      });
    });
  }

  private isValidGridPosition(row: number, col: number): boolean {
    return (
      row >= 0 &&
      row < GAME_CONFIG.GRID.HEIGHT &&
      col >= 0 &&
      col < GAME_CONFIG.GRID.WIDTH
    );
  }

  private tryWallKick(): boolean {
    for (const offset of WALL_KICK_OFFSETS) {
      const newX = this.currentPiece.x + offset.x;
      const newY = this.currentPiece.y + offset.y;

      if (this.canPlacePiece(newX, newY)) {
        this.currentPiece.x = newX;
        this.currentPiece.y = newY;
        return true;
      }
    }

    return false;
  }

  private getRotatedShape(shape: number[][]): number[][] {
    const n = shape.length;
    const rotated: number[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        rotated[j][n - 1 - i] = shape[i][j];
      }
    }

    return rotated;
  }

  private isRowComplete(row: number): boolean {
    return (
      row >= 0 &&
      row < GAME_CONFIG.GRID.HEIGHT &&
      this.grid[row].every((cell) => cell !== 0)
    );
  }

  private clearLine(row: number): void {
    this.grid.splice(row, 1);
    this.grid.unshift(new Array(GAME_CONFIG.GRID.WIDTH).fill(0));
  }

  private updateScore(linesCleared: number): void {
    this.gameState.lines += linesCleared;
    this.gameState.score += linesCleared * GAME_CONFIG.SCORING.POINTS_PER_LINE;

    const newLevel = Math.floor(this.gameState.lines / 10) + 1;
    if (newLevel > this.gameState.level) {
      this.gameState.level = newLevel;
      this.updateFallSpeed();
    }

    this.gameUI.updateScore(
      this.gameState.score,
      this.gameState.level,
      this.gameState.lines
    );
  }

  private startFallTimer(): void {
    this.stopFallTimer();

    const delay = this.calculateFallDelay();
    this.fallTimer = this.time.addEvent({
      delay,
      callback: () => {
        if (this.gameState.isPlaying) {
          this.movePiece(0, 1);
        }
      },
      loop: true,
    });
  }

  private stopFallTimer(): void {
    if (this.fallTimer) {
      this.fallTimer.destroy();
      this.fallTimer = null;
    }
  }

  private updateFallSpeed(): void {
    if (this.fallTimer && this.gameState.isPlaying) {
      this.startFallTimer();
    }
  }

  private calculateFallDelay(): number {
    return Math.max(
      100,
      GAME_CONFIG.TIMING.FALL_DELAY - (this.gameState.level - 1) * 100
    );
  }

  private redrawAll(): void {
    this.drawGrid();
    this.drawCurrentPiece();
  }

  private drawGrid(): void {
    this.gridGraphics.clear();

    const { startX, startY } = this.getGridPosition();

    this.drawGridBackground(startX, startY);
    this.drawGridLines(startX, startY);
    this.drawGridBorder(startX, startY);
    this.drawGridCells();
  }

  private getGridPosition(): { startX: number; startY: number } {
    const { WIDTH, HEIGHT, CELL_SIZE } = GAME_CONFIG.GRID;
    const startX = (this.scale.width - WIDTH * CELL_SIZE) / 2;
    const startY = (this.scale.height - HEIGHT * CELL_SIZE) / 2;
    return { startX, startY };
  }

  private drawGridBackground(startX: number, startY: number): void {
    const { WIDTH, HEIGHT, CELL_SIZE } = GAME_CONFIG.GRID;
    const { GRID_BACKGROUND, GRID_BACKGROUND_ALPHA } = GAME_CONFIG.COLORS;

    this.gridGraphics.fillStyle(GRID_BACKGROUND, GRID_BACKGROUND_ALPHA);
    this.gridGraphics.fillRect(
      startX,
      startY,
      WIDTH * CELL_SIZE,
      HEIGHT * CELL_SIZE
    );
  }

  private drawGridLines(startX: number, startY: number): void {
    const { WIDTH, HEIGHT, CELL_SIZE } = GAME_CONFIG.GRID;
    const { GRID_LINE, GRID_LINE_ALPHA } = GAME_CONFIG.COLORS;

    this.gridGraphics.lineStyle(1, GRID_LINE, GRID_LINE_ALPHA);

    for (let col = 0; col <= WIDTH; col++) {
      const x = startX + col * CELL_SIZE;
      this.gridGraphics.moveTo(x, startY);
      this.gridGraphics.lineTo(x, startY + HEIGHT * CELL_SIZE);
    }

    for (let row = 0; row <= HEIGHT; row++) {
      const y = startY + row * CELL_SIZE;
      this.gridGraphics.moveTo(startX, y);
      this.gridGraphics.lineTo(startX + WIDTH * CELL_SIZE, y);
    }

    this.gridGraphics.strokePath();
  }

  private drawGridBorder(startX: number, startY: number): void {
    const { WIDTH, HEIGHT, CELL_SIZE } = GAME_CONFIG.GRID;
    const { GRID_BORDER } = GAME_CONFIG.COLORS;

    this.gridGraphics.lineStyle(2, GRID_BORDER, 1);
    this.gridGraphics.strokeRect(
      startX,
      startY,
      WIDTH * CELL_SIZE,
      HEIGHT * CELL_SIZE
    );
  }

  private drawGridCells(): void {
    for (let row = 0; row < GAME_CONFIG.GRID.HEIGHT; row++) {
      for (let col = 0; col < GAME_CONFIG.GRID.WIDTH; col++) {
        if (this.grid[row][col] !== 0) {
          this.drawCell(row, col, this.grid[row][col]);
        }
      }
    }
  }

  private drawCell(row: number, col: number, value: number): void {
    const { startX, startY } = this.getGridPosition();
    const { CELL_SIZE } = GAME_CONFIG.GRID;

    const x = startX + col * CELL_SIZE;
    const y = startY + row * CELL_SIZE;
    // グリッドセルでは値をそのまま使用（I-テトロミノの値は1）
    const color = TETROMINO_COLORS[value] || 0xffffff;

    this.gridGraphics.fillStyle(color, 1);
    this.gridGraphics.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
  }

  private drawCurrentPiece(): void {
    if (!this.currentPiece.blocks || this.currentPiece.type === null) return;

    const { startX, startY } = this.getGridPosition();
    const { CELL_SIZE } = GAME_CONFIG.GRID;
    const colorIndex = this.currentPiece.type as number;
    // I-テトロミノ（type=0）の場合、インデックス1（シアン色）を使用
    const color = TETROMINO_COLORS[colorIndex + 1];

    this.currentPiece.blocks.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell) {
          const x = startX + (this.currentPiece.x + colIndex) * CELL_SIZE;
          const y = startY + (this.currentPiece.y + rowIndex) * CELL_SIZE;

          this.gridGraphics.fillStyle(color, 1);
          this.gridGraphics.fillRect(
            x + 1,
            y + 1,
            CELL_SIZE - 2,
            CELL_SIZE - 2
          );
        }
      });
    });
  }

  private showGameStartMessage(): void {
    const { width, height } = this.cameras.main;
    const { MESSAGE_TEXT, MESSAGE_BACKGROUND } = GAME_CONFIG.COLORS;

    const startMessage = this.add
      .text(width / 2, height / 2, "GAME STARTED!\nControls active in 1.5s", {
        fontSize: "28px",
        color: MESSAGE_TEXT,
        backgroundColor: MESSAGE_BACKGROUND,
        padding: { x: 20, y: 10 },
        align: "center",
      })
      .setOrigin(0.5);

    this.time.delayedCall(GAME_CONFIG.TIMING.MESSAGE_DURATION, () => {
      startMessage.destroy();
    });
  }

  public clearGrid(): void {
    for (let row = 0; row < GAME_CONFIG.GRID.HEIGHT; row++) {
      for (let col = 0; col < GAME_CONFIG.GRID.WIDTH; col++) {
        this.grid[row][col] = 0;
      }
    }
  }

  private cleanup(): void {
    this.gameUI?.destroy();
    this.stopFallTimer();
    this.keyboardCallbacks.forEach((callback) => {
      this.input.keyboard!.off("keydown", callback);
    });
    this.keyboardCallbacks = [];
  }

}
