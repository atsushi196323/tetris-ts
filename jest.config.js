/** @type {import('jest').Config} */
module.exports = {
    // TypeScriptファイルを処理するためのプリセット
    preset: 'ts-jest',

    // テスト環境
    testEnvironment: 'node',

    // テストファイルのパターン
    testMatch: [
        '**/__tests__/**/*.test.ts',
        '**/*.test.ts'
    ],

    // カバレッジ設定
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/*.test.ts'
    ],

    // モジュール名のマッピング
    moduleNameMapper: {
        // Phaserのモック
        '^phaser$': '<rootDir>/src/__mocks__/phaser.ts'
    },

    // モジュールの変換を無視
    transformIgnorePatterns: [
        'node_modules/(?!(phaser)/)'
    ],

    transform: {
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: 'tsconfig.json'
        }]
    },

    // タイムアウト設定（フリーズ検出テストのため）
    testTimeout: 10000
};