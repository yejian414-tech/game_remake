// src/data/items.js

export const ItemDB = [
  {
    id: 'shield_guardian',
    name: 'Guardian Shield',
    desc: 'Legendary shield of the Knight Captain, glowing with divine light',
    rarity: 'rare',
    icon: 'shield',
    statBonus: { toughness: 8, strength: 2 },
    slot: 0,
  },
  {
    id: 'giant_sword',
    name: 'Greatsword',
    desc: 'Heavy and sharp two-handed sword, whistling through the air',
    rarity: 'epic',
    icon: 'sword',
    statBonus: { strength: 12 },
    slot: 0,
  },
  {
    id: 'holy_water',
    name: 'Holy Water',
    desc: 'Holy water with healing power, restores HP on use',
    rarity: 'common',
    icon: 'potion',
    statBonus: {},
    slot: 1,
  },
  {
    id: 'lightning_boots',
    name: 'Lightning Boots',
    desc: 'Light boots engraved with lightning patterns, move like the wind',
    rarity: 'rare',
    icon: 'boots',
    statBonus: { agility: 10 },
    slot: 1,
  },
  {
    id: 'lucky_clover',
    name: 'Lucky Clover Badge',
    desc: 'Ancient clover-shaped badge, brings luck to the wearer',
    rarity: 'common',
    icon: 'clover',
    statBonus: { talent: 6, awareness: 4 },
    slot: 1,
  },
];

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

export const RARITY_COLORS = {
  common: { main: '#a0a0a0', glow: '#cccccc', label: 'Common' },
  rare:   { main: '#3b82f6', glow: '#60a5fa', label: 'Rare' },
  epic:   { main: '#a855f7', glow: '#c084fc', label: 'Epic' },
};