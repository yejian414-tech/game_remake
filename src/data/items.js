// src/data/items.js

/**
 * 游戏道具定义
 * 每个道具包含：id, name, desc, rarity, icon（p5绘制指令标识）
 * rarity: 'common' | 'rare' | 'epic'
 */
export const ItemDB = [
  {
    id: 'shield_guardian',
    name: '守护者之盾',
    desc: '传说中骑士团长的护盾，散发着神圣的光芒',
    rarity: 'rare',
    icon: 'shield',
    statBonus: { toughness: 8, strength: 2 },
    slot: 0,
  },
  {
    id: 'giant_sword',
    name: '巨剑',
    desc: '沉重而锋利的双手巨剑，挥舞时带有呼啸风声',
    rarity: 'epic',
    icon: 'sword',
    statBonus: { strength: 12 },
    slot: 0,
  },
  {
    id: 'holy_water',
    name: '圣水瓶',
    desc: '蕴含治愈之力的圣水，饮用后恢复生命',
    rarity: 'common',
    icon: 'potion',
    statBonus: {},
    slot: 1,
  },
  {
    id: 'lightning_boots',
    name: '闪电靴子',
    desc: '镌刻着雷电纹路的轻靴，穿上后脚步如风',
    rarity: 'rare',
    icon: 'boots',
    statBonus: { agility: 10 },
    slot: 1,
  },
  {
    id: 'lucky_clover',
    name: '幸运草徽章',
    desc: '四叶草形状的古老徽章，佩戴者总能逢凶化吉',
    rarity: 'common',
    icon: 'clover',
    statBonus: { talent: 6, awareness: 4 },
    slot: 1,
  },
];

/**
 * 根据权重随机获取一个道具
 * @returns {object} 道具副本
 */
export function rollRandomItem() {
  const weights = ItemDB.map(item => {
    if (item.rarity === 'epic') return 1;
    if (item.rarity === 'rare') return 3;
    return 5;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < ItemDB.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return { ...ItemDB[i] };
  }
  return { ...ItemDB[0] };
}

/** 稀有度颜色映射 */
export const RARITY_COLORS = {
  common: { main: '#a0a0a0', glow: '#cccccc', label: '普通' },
  rare:   { main: '#3b82f6', glow: '#60a5fa', label: '稀有' },
  epic:   { main: '#a855f7', glow: '#c084fc', label: '史诗' },
};
