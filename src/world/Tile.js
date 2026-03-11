// src/world/Tile.js
import { DataLoader } from '../data/DataLoader.js';

export const TileType = {
  GRASS: { id: 0, color: '#7cfc00', name: 'Plains', moveCost: 1 },
  FOREST: { id: 1, color: '#228b22', name: 'Forest', moveCost: 1 },
  MOUNTAIN: { id: 2, color: '#8b4513', name: 'Mountains', moveCost: 2 },
  BARRIER: { id: 3, color: '#808080', name: 'Barrier', moveCost: Infinity },
};

export const TileContentType = {
  DUNGEON: 'dungeon',
  BOSS: 'boss',
  TREASURE: 'treasure',
  ALTAR: 'altar', 
  LIGHTHOUSE: 'lighthouse',
};

export function makeDungeon(name, level = 1, difficulty = 'NORMAL') {
  return { type: TileContentType.DUNGEON, name, level, difficulty };
}

export function makeBoss(name, level = 5) {
  return { type: TileContentType.BOSS, name, level, difficulty: 'EXTREME' };
}

export function makeTreasure(lootTier = 1) {
  const tierName = ['', 'Common Chest', 'Rare Chest', 'Epic Chest'][lootTier] ?? 'Common Chest';
  return { type: TileContentType.TREASURE, name: tierName, lootTier };
}
export function makeAltar(level = 1) {
  return { type: TileContentType.ALTAR, name: "Mysterious Altar", level };
}
export function makeLighthouse(level = 1) {
  return { type: TileContentType.LIGHTHOUSE, name: "Ancient Lighthouse", level };
}

export class Tile {
  constructor(q, r, type = TileType.GRASS) {
    this.q = q;
    this.r = r;
    this.type = type;
    this.content = null;
    this.isRevealed = false;
    // 随机选择一个变体 (1-4)
    this.variant = Math.floor(Math.random() * 4) + 1;
  }

  getCanvasPos(size) {
    return {
      x: size * (3 / 2 * this.q),
      y: size * (Math.sqrt(3) / 2 * this.q + Math.sqrt(3) * this.r),
    };
  }

  draw(ctx, size, isSelected = false, visState = 'visible') {
    const { x, y } = this.getCanvasPos(size);

    const hexPath = () => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    // 1. 处理战争迷雾 (完全未探索)
    if (visState === 'hidden') {
      hexPath();
      ctx.fillStyle = '#0a0a14';
      ctx.fill();
      return;
    }

    // 2. 绘制地形图片 (完全取代原来的色块填充)
    let terrainKey = '';
    if (this.type.id === 0) terrainKey = `grass_${this.variant}`; // 草地
    else if (this.type.id === 3) terrainKey = `barrier_${this.variant}`; // 障碍物
    else terrainKey = `grass_1`; // 默认地形

    const terrainImg = DataLoader.getImage(terrainKey);
    if (terrainImg) {
      // 绘图区域稍微放大以无缝拼接
      ctx.drawImage(terrainImg, x - size, y - size, size * 2, size * 2);
    }

    // 3. 绘制内容图片 (Dungeon, Boss, Treasure 等图标)
    if (this.content && visState === 'visible') {
      const contentImg = DataLoader.getImage(this.content.type);
      if (contentImg) {
        const imgSize = size * 1.5;
        ctx.drawImage(contentImg, x - imgSize/2, y - imgSize/2, imgSize, imgSize);
      }
    }

    // 4. 绘制选中边框
    if (isSelected) {
      hexPath();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // 5. 已探索但视野外：叠半透明暗色蒙版
    if (visState === 'explored') {
      hexPath();
      ctx.fillStyle = 'rgba(10, 10, 20, 0.55)';
      ctx.fill();
    }
  }
}