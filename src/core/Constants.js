// src/core/Constants.js
export const GameState = {
  INITIALIZING: 'INITIALIZING',      // 初始化资源
  CHARACTER_SELECT: 'CHARACTER_SELECT',  // 选择英雄（选2个）
  MAP_GENERATION: 'MAP_GENERATION',    // 生成地图过渡
  MAP_EXPLORATION: 'MAP_EXPLORATION',   // 大地图探索模式
  COMBAT: 'COMBAT',            // 战斗模式
  RANDOM_EVENT: 'RANDOM_EVENT',      // 随机事件弹窗
  TURN_TRANSITION: 'TURN_TRANSITION'    // 回合切换过渡阶段
};

export const TurnPhase = {
  START: 'START',    // 结算 Buff，恢复点数
  PLAYER_MOVE: 'MOVE',    // 玩家操作中
  EVALUATE: 'EVALUATE', // 格子判定
  END: 'END'       // 点击结束按钮后的结算
};
