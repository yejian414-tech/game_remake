// 村庄内容生成器
export function makeVillage(name = '村庄') {
  return {
    type: 'village',
    name,
    dialogue: '欢迎来到村庄。',
    iconType: 'greenCircle',
  };
}
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
  NPC: 'npc', // 新增NPC类型
};
// NPC内容生成器
/**
 * 创建一个NPC事件内容对象
 * @param {string} name - NPC名字
 * @param {string} dialogue - NPC对话文本
 * @param {Object} [options] - 额外选项，如基于物品的能力
 * @returns {Object}
 */
export function makeNPC(name, dialogue = '你好，旅行者！', options = {}) {
  return {
    type: TileContentType.NPC,
    name,
    dialogue,
    ...options // 支持扩展：如iconType、基于物品的能力等
  };
}
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

  draw(ctx, size, isSelected = false, visState = 'visible', debugMode = false) {
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

  // 绘制内容图片 (Dungeon, Boss, NPC等图标)
  if (this.content && visState === 'visible') {
    // 检查是否有自定义iconType（用于圆圈图标）
    const iconType = this.content.iconType;
    if (iconType === 'redCircle' || iconType === 'greenCircle') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = iconType === 'redCircle' ? 'red' : 'green';
      ctx.globalAlpha = 0.85;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.restore();
    } else if (this.content.type === TileContentType.NPC) {
      // 根据iconType渲染不同NPC图标，默认红圈
      const defaultIconType = this.content.iconType || 'redCircle';
      if (defaultIconType === 'redCircle') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = 'red';
        ctx.globalAlpha = 0.85;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        ctx.restore();
      }
      // 未来可扩展更多iconType
    } else {
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

    // 6. debug模式下显示坐标
    if (debugMode && visState !== 'hidden') {
      ctx.save();
      ctx.font = `${Math.floor(size * 0.45)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      const coordText = `(${this.q},${this.r})`;
      ctx.strokeText(coordText, x, y);
      ctx.fillText(coordText, x, y);
      ctx.restore();
    }
  }
}