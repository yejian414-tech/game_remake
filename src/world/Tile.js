// src/world/Tile.js
import { DataLoader } from '../data/DataLoader.js';

export const TileType = {
  GRASS: { id: 0, color: '#7cfc00', name: 'Plains', moveCost: 1 },
  FOREST: { id: 1, color: '#228b22', name: 'Forest', moveCost: 1 },
  MOUNTAIN: { id: 2, color: '#8b4513', name: 'Mountains', moveCost: 2 },
  BARRIER: { id: 3, color: '#808080', name: 'Barrier', moveCost: Infinity },
  BOUNDARY: { id: 4, color: '#8b4513', name: 'Boundary', moveCost: Infinity },
};

export const TileContentType = {
  DUNGEON: 'dungeon',
  BOSS: 'boss',
  TREASURE: 'treasure',
  ALTAR: 'altar', 
  LIGHTHOUSE: 'lighthouse',
  PORTAL: 'portal', // 传送阵
};
// 传送阵内容生成器
export function makePortal(targetMap, targetQ, targetR) {
  return { type: TileContentType.PORTAL, name: '传送阵', targetMap, targetQ, targetR };
}

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

    ctx.save();
    hexPath();
    ctx.fillStyle = '#4a7c2c'; // 匹配草地的深色基调
    ctx.fill();
    ctx.strokeStyle = '#4a7c2c';
    ctx.lineWidth = 1; 
    ctx.stroke();
    ctx.restore();


    const imgW = size * 2;
    const imgH = size * Math.sqrt(3);
    // 2. 绘制地形图片 (完全取代原来的色块填充)
    let terrainKey = '';
    if (this.type.id === 0) terrainKey = `grass_${this.variant}`; // 草地
    else if (this.type.id === 1) terrainKey = `forest_${this.variant}`; // 森林
    else if (this.type.id === 2) terrainKey = `mountain_${this.variant}`; // 山脉
    else if (this.type.id === 3) terrainKey = `barrier_${this.variant}`; // 障碍物
    else if (this.type.id === 4) terrainKey = `boundary_${this.variant}`; // 边界
    else terrainKey = `grass_1`; // 默认地形

    const terrainImg = DataLoader.getImage(terrainKey);
    if (terrainImg) {
    // 计算平顶六边形的正确比例
    const bleed = 0.5; 
    ctx.drawImage(
      terrainImg, 
      x - size - bleed / 2,      // 水平起点微调
      y - imgH / 2 - bleed / 2,  // 垂直起点微调
      imgW + bleed,              // 宽度微增
      imgH + bleed            // 高度
    );
  }

  // 绘制内容图片 (Dungeon, Boss 等图标)
  if (this.content && visState === 'visible') {
    const contentImg = DataLoader.getImage(this.content.type);
    if (contentImg) {
    // 设置缩放比例，例如 0.85 表示图标大小为格子的 85%，留下 15% 的边框缝隙
      const scale = 0.92; 
    
    // 计算缩放后的宽度和高度
      const imgW = (size * 2) * scale;
      const imgH = (size * Math.sqrt(3)) * scale; 

    // 使用缩放后的宽高，并重新计算起始坐标 (x - 宽/2, y - 高/2) 以确保图标依然在格子中心
      ctx.drawImage(
        contentImg,
        x - imgW / 2, // 水平居中偏移
        y - imgH / 2, // 垂直居中偏移
        imgW, 
        imgH
      );
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