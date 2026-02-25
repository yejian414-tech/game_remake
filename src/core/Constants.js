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

// 可选的英雄池（占位数据，后续替换为真实属性/技能）
export const HeroRoster = [
  { id: 'warrior', name: '战士', hp: 140, desc: '高血量，擅长近战' },
  { id: 'mage', name: '法师', hp: 80, desc: '低血量，魔法伤害高' },
  { id: 'ranger', name: '游侠', hp: 100, desc: '均衡，擅长远程' },
  { id: 'rogue', name: '盗贼', hp: 90, desc: '速度快，暴击率高' },
];