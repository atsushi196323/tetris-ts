import * as Phaser from "phaser";
import { GameUI, GameState, getDefaultUIConfig } from "./ui/gameUI";
import { TetrominoType } from "./nextAndHold";
import {
  generateTetromino,
  BlockShape,
  TETROMINO_COLORS,
  getTetrominoByIndex,
} from "./tetromino";
import { SoundManager, SoundType } from "./assets/sounds/soundAndEffect";

/**
 * デバッグ用のログレベル
 */
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * デバッグ用のログ出力クラス
 */
class DebugLogger {
  private static level: LogLevel = LogLevel.DEBUG;

  static debug(message: string, data?: any): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(
        `[DEBUG] ${new Date().toISOString()} - ${message}`,
        data || ""
      );
    }
  }

  static info(message: string, data?: any): void {
    if (this.level <= LogLevel.INFO) {
      console.log(
        `[INFO] ${new Date().toISOString()} - ${message}`,
        data || ""
      );
    }
  }

  static warn(message: string, data?: any): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(
        `[WARN] ${new Date().toISOString()} - ${message}`,
        data || ""
      );
    }
  }

  static error(message: string, error?: any): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(
        `[ERROR] ${new Date().toISOString()} - ${message}`,
        error || ""
      );
    }
  }
}

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
  DEBUG: {
    MAX_SPAWN_ATTEMPTS: 5, // 無限ループ防止
    PERFORMANCE_MONITOR: true, // パフォーマンス監視
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
 * テトリスゲームのメインシーンクラス（デバッグ機能付き）
 */
export class GameScene extends Phaser.Scene {
  // デバッグ用カウンター
  private debugCounters = {
    spawnAttempts: 0,
    lockPieceCalls: 0,
    clearLinesCalls: 0,
    rotationAttempts: 0,
    lastOperationTime: 0,
  };

  // パフォーマンス監視
  private performanceMonitor = {
    enabled: GAME_CONFIG.DEBUG.PERFORMANCE_MONITOR,
    frameCount: 0,
    lastCheck: 0,
    avgFrameTime: 0,
  };

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
    DebugLogger.info("GameScene constructor called");
  }

  /**
   * ===================================
   * Phaser ライフサイクルメソッド
   * ===================================
   */

  create(): void {
    DebugLogger.info("GameScene create() started");
    try {
      this.initializeGame();
      this.setupUI();
      this.setupInputs();
      this.setupEventListeners();
      this.initializeDebugDisplay();
      this.startPerformanceMonitoring();
      DebugLogger.info("GameScene create() completed successfully");
    } catch (error) {
      DebugLogger.error("Error in GameScene create()", error);
      throw error;
    }
  }

  update(time: number, delta: number): void {
    try {
      this.updatePerformanceMonitor(time, delta);
      this.checkForHangs(time);
    } catch (error) {
      DebugLogger.error("Error in GameScene update()", error);
    }
  }

  destroy(): void {
    DebugLogger.info("GameScene destroy() called");
    try {
      this.cleanup();
    } catch (error) {
      DebugLogger.error("Error in GameScene destroy()", error);
    }
  }

  /**
   * ===================================
   * デバッグ・監視メソッド
   * ===================================
   */

  private startPerformanceMonitoring(): void {
    if (!this.performanceMonitor.enabled) return;

    this.performanceMonitor.lastCheck = Date.now();

    // 5秒ごとにパフォーマンス情報を出力
    this.time.addEvent({
      delay: 5000,
      callback: () => this.logPerformanceInfo(),
      loop: true,
    });
  }

  private updatePerformanceMonitor(time: number, delta: number): void {
    if (!this.performanceMonitor.enabled) return;

    this.performanceMonitor.frameCount++;
    this.performanceMonitor.avgFrameTime =
      (this.performanceMonitor.avgFrameTime + delta) / 2;
  }

  private logPerformanceInfo(): void {
    const now = Date.now();
    const timeDiff = now - this.performanceMonitor.lastCheck;
    const fps = Math.round(
      (this.performanceMonitor.frameCount * 1000) / timeDiff
    );

    DebugLogger.info(
      `Performance: FPS=${fps}, AvgFrameTime=${this.performanceMonitor.avgFrameTime.toFixed(2)}ms`
    );
    DebugLogger.debug("Debug Counters", this.debugCounters);

    this.performanceMonitor.frameCount = 0;
    this.performanceMonitor.lastCheck = now;
  }

  private checkForHangs(currentTime: number): void {
    const timeSinceLastOp = currentTime - this.debugCounters.lastOperationTime;

    // 5秒間操作がない場合は警告
    if (timeSinceLastOp > 5000 && this.gameState.isPlaying) {
      DebugLogger.warn(
        `No operations for ${timeSinceLastOp}ms - possible hang?`
      );
    }
  }

  private logOperation(operation: string, data?: any): void {
    this.debugCounters.lastOperationTime = Date.now();
    DebugLogger.debug(`Operation: ${operation}`, data);
  }

  /**
   * ===================================
   * 初期化メソッド（デバッグ強化）
   * ===================================
   */

  private initializeGame(): void {
    DebugLogger.debug("Initializing game...");
    this.initializeGrid();
    this.gridGraphics = this.add.graphics();
    this.drawGrid();
  }

  private setupUI(): void {
    DebugLogger.debug("Setting up UI...");
    const uiConfig = getDefaultUIConfig();
    this.gameUI = new GameUI(this, uiConfig);
  }

  private setupInputs(): void {
    DebugLogger.debug("Setting up inputs...");
    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  private initializeDebugDisplay(): void {
    DebugLogger.debug("Initializing debug display...");
    this.gameUI.updateScore(0, 1, 0);
    this.gameUI.updateNextPieces([
      TetrominoType.T,
      TetrominoType.I,
      TetrominoType.O,
    ]);
  }

  private initializeGrid(): void {
    DebugLogger.debug("Initializing grid...");
    this.grid = Array(GAME_CONFIG.GRID.HEIGHT)
      .fill(null)
      .map(() => Array(GAME_CONFIG.GRID.WIDTH).fill(0));
  }

  /**
   * ===================================
   * イベントリスナー設定（エラーハンドリング強化）
   * ===================================
   */

  private setupEventListeners(): void {
    DebugLogger.debug("Setting up event listeners...");

    const eventHandlers = {
      gameStart: () =>
        this.safeExecute(() => this.handleGameStart(), "handleGameStart"),
      gamePause: () =>
        this.safeExecute(() => this.handleGamePause(), "handleGamePause"),
      gameResume: () =>
        this.safeExecute(() => this.handleGameResume(), "handleGameResume"),
      gameRestart: () =>
        this.safeExecute(() => this.handleGameRestart(), "handleGameRestart"),
      gameStop: () =>
        this.safeExecute(() => this.handleGameStop(), "handleGameStop"),
    };

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      this.events.on(event, handler);
    });

    DebugLogger.debug("Event listeners setup completed");
  }

  private safeExecute(fn: () => void, name: string): void {
    try {
      DebugLogger.debug(`Executing: ${name}`);
      fn();
    } catch (error) {
      DebugLogger.error(`Error in ${name}`, error);
      // ゲームを安全な状態に戻す
      this.handleError(error, name);
    }
  }

  private handleError(error: any, context: string): void {
    DebugLogger.error(`Handling error in ${context}`, error);

    // ゲームを一時停止
    this.gameState.isPlaying = false;

    // タイマーを停止
    this.stopFallTimer();

    // エラー情報を表示
    this.showErrorMessage(`Error in ${context}: ${error.message}`);
  }

  private showErrorMessage(message: string): void {
    const { width, height } = this.cameras.main;

    const errorMessage = this.add
      .text(width / 2, height / 2, `ERROR!\n${message}`, {
        fontSize: "24px",
        color: "#ff0000",
        backgroundColor: "#000000",
        padding: { x: 20, y: 10 },
        align: "center",
      })
      .setOrigin(0.5);

    this.time.delayedCall(5000, () => {
      errorMessage.destroy();
    });
  }

  /**
   * ===================================
   * ゲーム制御メソッド（修正版）
   * ===================================
   */

  private startGameplay(): void {
    this.logOperation("startGameplay");

    // 重複実行チェック
    if (this.gameState.isPlaying) {
      DebugLogger.warn("startGameplay called while already playing");
      return;
    }

    this.gameState.isPlaying = true;
    this.resetGameState();
    this.clearGrid();
    this.drawGrid();
    this.spawnNewPiece();
    this.startFallTimer();
    this.setupKeyboardControls();

    // ゲーム開始後1.5秒間は入力をロック
    this.isInputLocked = true;
    this.time.delayedCall(1500, () => {
      this.isInputLocked = false;
      DebugLogger.debug("Input unlocked - controls are now active");
    });

    // メッセージ表示（重複削除）
    this.showGameStartMessage();

    DebugLogger.info("Gameplay started successfully");
  }

  /**
   * ===================================
   * ピース操作メソッド（安全性強化）
   * ===================================
   */

  private spawnNewPiece(): void {
    this.logOperation("spawnNewPiece");
    this.debugCounters.spawnAttempts++;

    // 無限ループ防止
    if (
      this.debugCounters.spawnAttempts > GAME_CONFIG.DEBUG.MAX_SPAWN_ATTEMPTS
    ) {
      DebugLogger.error("Too many spawn attempts - forcing game over");
      this.gameOver();
      return;
    }

    // ゲーム終了チェック
    if (!this.gameState.isPlaying) {
      DebugLogger.warn("spawnNewPiece called when game is not playing");
      return;
    }

    const tetrominoIndex = Math.floor(Math.random() * 7);
    const tetrominoTypes = [
      TetrominoType.I,
      TetrominoType.O,
      TetrominoType.T,
      TetrominoType.S,
      TetrominoType.Z,
      TetrominoType.J,
      TetrominoType.L,
    ];

    const generatedShape = getTetrominoByIndex(tetrominoIndex);
    const pieceType = tetrominoTypes[tetrominoIndex];

    this.currentPiece = {
      blocks: generatedShape,
      type: pieceType,
      x: Math.floor(GAME_CONFIG.GRID.WIDTH / 2) - 2,
      y: 0,
    };

    if (!this.canPlacePiece(this.currentPiece.x, this.currentPiece.y)) {
      DebugLogger.warn("Cannot place new piece - game over");
      this.gameOver();
      return;
    }

    // 成功したらカウンターをリセット
    this.debugCounters.spawnAttempts = 0;
    this.redrawAll();
    DebugLogger.debug("New piece spawned:", pieceType);
  }

  private lockPiece(): void {
    this.logOperation("lockPiece");
    this.debugCounters.lockPieceCalls++;

    if (!this.currentPiece.blocks || !this.currentPiece.type) {
      DebugLogger.warn("lockPiece called with no current piece");
      return;
    }

    // 無限ループ防止
    if (this.debugCounters.lockPieceCalls > 100) {
      DebugLogger.error("Too many lockPiece calls - possible infinite loop");
      this.gameOver();
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
    this.logOperation("checkAndClearLines");
    this.debugCounters.clearLinesCalls++;

    // 無限ループ防止
    if (this.debugCounters.clearLinesCalls > 50) {
      DebugLogger.error("Too many checkAndClearLines calls");
      return;
    }

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
      DebugLogger.info(`Cleared ${linesCleared} lines!`);
    }

    // 処理完了後カウンターをリセット
    this.debugCounters.clearLinesCalls = 0;
  }

  private gameOver(): void {
    this.logOperation("gameOver");
    DebugLogger.info("Game Over triggered");

    this.gameState.isPlaying = false;
    this.stopFallTimer();

    // カウンターをリセット
    Object.keys(this.debugCounters).forEach((key) => {
      if (key !== "lastOperationTime") {
        (this.debugCounters as any)[key] = 0;
      }
    });

    this.gameUI.gameOver();
  }

  /**
   * ===================================
   * 既存メソッドの継続...
   * ===================================
   */

  private setupKeyboardControls(): void {
    DebugLogger.debug("Setting up keyboard controls...");

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
          this.safeExecute(() => action(), `keydown-${key}`);
        }
      };
      this.input.keyboard!.on(`keydown-${key}`, callback);
      this.keyboardCallbacks.push(callback);
    });
  }

  // [他のメソッドは省略 - 必要に応じて同様のデバッグ機能を追加]

  private handleGameStart(): void {
    this.logOperation("handleGameStart");
    this.startGameplay();
  }

  private handleGamePause(): void {
    this.logOperation("handleGamePause");
    this.pauseGameplay();
  }

  private handleGameResume(): void {
    this.logOperation("handleGameResume");
    this.resumeGameplay();
  }

  private handleGameRestart(): void {
    this.logOperation("handleGameRestart");
    this.restartGame();
  }

  private handleGameStop(): void {
    this.logOperation("handleGameStop");
    this.stopGameplay();
  }

  private pauseGameplay(): void {
    DebugLogger.debug("Pausing gameplay...");
    this.gameState.isPlaying = false;

    if (this.fallTimer) {
      this.fallTimer.paused = true;
    }
  }

  private resumeGameplay(): void {
    DebugLogger.debug("Resuming gameplay...");
    this.gameState.isPlaying = true;

    if (this.fallTimer) {
      this.fallTimer.paused = false;
    }
  }

  private stopGameplay(): void {
    DebugLogger.debug("Stopping gameplay...");
    this.gameState.isPlaying = false;

    this.stopFallTimer();
    this.clearGrid();
    this.drawGrid();
  }

  private restartGame(): void {
    this.logOperation("restartGame");
    this.stopGameplay();
    this.resetGameState();
    this.gameUI.updateScore(0, 1, 0);
    this.isInputLocked = false;

    // カウンターをリセット
    Object.keys(this.debugCounters).forEach((key) => {
      if (key !== "lastOperationTime") {
        (this.debugCounters as any)[key] = 0;
      }
    });

    this.startGameplay();
    DebugLogger.info("Game restarted!");
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
    this.logOperation(`handleMove(${dx}, ${dy})`);
    this.movePiece(dx, dy);
  }

  private handleRotate(): void {
    this.logOperation("handleRotate");
    this.debugCounters.rotationAttempts++;
    this.rotatePiece();
  }

  private handleDrop(): void {
    this.logOperation("handleDrop");
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
    const color = TETROMINO_COLORS[value - 1] || 0xffffff;

    this.gridGraphics.fillStyle(color, 1);
    this.gridGraphics.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
  }

  private drawCurrentPiece(): void {
    if (!this.currentPiece.blocks || !this.currentPiece.type) return;

    const { startX, startY } = this.getGridPosition();
    const { CELL_SIZE } = GAME_CONFIG.GRID;
    const colorIndex = Object.values(TetrominoType).indexOf(
      this.currentPiece.type
    );
    const color = TETROMINO_COLORS[colorIndex];

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
    DebugLogger.info("Cleaning up GameScene...");
    this.gameUI?.destroy();
    this.stopFallTimer();
    this.keyboardCallbacks.forEach((callback) => {
      this.input.keyboard!.off("keydown", callback);
    });
    this.keyboardCallbacks = [];
  }
}
