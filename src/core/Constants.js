// src/core/Constants.js

export const GameState = {
  INITIALIZING: 'INITIALIZING',
  CHARACTER_SELECT: 'CHARACTER_SELECT',
  MAP_GENERATION: 'MAP_GENERATION',
  MAP_EXPLORATION: 'MAP_EXPLORATION',
  COMBAT: 'COMBAT',
  GAME_OVER: 'GAME_OVER',
};

export const TurnPhase = {
  START: 'START',
  PLAYER_MOVE: 'MOVE',
  EVALUATE: 'EVALUATE',
  END: 'END',
};

export const CombatPhase = {
  START: 'START',               // 战斗初始化
  PLAYER_TURN: 'PLAYER_TURN',   // 等待玩家选技能
  AWAIT_TARGET: 'AWAIT_TARGET', // 等待玩家选目标
  ROLLING: 'ROLLING',           // 正在摇骰子动画
  EXECUTING: 'EXECUTING',       // 正在播放斩击、飘字动画
  ENEMY_TURN: 'ENEMY_TURN',     // AI 回合
  WIN: 'WIN',
  LOSE: 'LOSE',
};

// ── 地图全局配置（main.js 和 GameController.js 统一读这里）──
export const MapConfig = {
  RADIUS: 20,   // 地图半径
  TILE_SIZE: 40, // 格子像素尺寸
  PADDING: 100,  // 初始视角边缘留白
};

// ── 回合进度配置 ─────────────────────────────────────────────
export const TurnConfig = {
  MAX_TURNS: 20, // 进度条终点
};