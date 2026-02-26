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
  TURN_START: 'TURN_START',
  AWAIT_PLAYER: 'AWAIT_PLAYER',
  EXECUTING: 'EXECUTING',
  WIN: 'WIN',
  LOSE: 'LOSE',
};

// ── 地图全局配置（main.js 和 GameController.js 统一读这里）──
export const MapConfig = {
  RADIUS: 20,  // 地图半径
  TILE_SIZE: 40,  // 格子像素尺寸
  PADDING: 100, // 初始视角边缘留白
};