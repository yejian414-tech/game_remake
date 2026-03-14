// src/core/Constants.js

// ── 游戏状态机 ────────────────────────────────────────────────────
export const GameState = {
  INITIALIZING: 'INITIALIZING',
  CHARACTER_SELECT: 'CHARACTER_SELECT',
  STORY: 'STORY',
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

// ── 多地图参数预设（唯一数据源）─────────────────────────────────────
// 注意：MapConfig 直接引用此处，不再另立一份，避免两处数值不同步。
export const MapPresets = {
  main: {
    name: '迷失森林',
    radius: 11,
    tileSize: 40,
    padding: 100,  // 初始相机边缘留白
    eventLogic: 'default',
  },
  novice: {
    name: '新手村',
    radius: 5,
    tileSize: 40,
    padding: 80,
    eventLogic: 'default',
  },
  // 在此继续添加更多地图预设 ↓
};

// ── MapConfig：从 main 预设派生，供 main.js / GameController 使用 ──
// 只读快捷方式，勿在此处直接修改数值，应改动 MapPresets.main。
export const MapConfig = {
  RADIUS: MapPresets.main.radius,
  TILE_SIZE: MapPresets.main.tileSize,
  PADDING: MapPresets.main.padding,
};

// ── 回合进度配置 ─────────────────────────────────────────────────
export const TurnConfig = {
  MAX_TURNS: 20,
};