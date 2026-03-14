// src/world/Tile.js
import { DataLoader } from '../data/DataLoader.js';

export const TileType = {
  GRASS: { id: 0, color: '#7cfc00', name: 'Plains', moveCost: 1 },
  FOREST: { id: 1, color: '#228b22', name: 'Forest', moveCost: Infinity },
  MOUNTAIN: { id: 2, color: '#8b4513', name: 'Mountains', moveCost: Infinity },
  BARRIER: { id: 3, color: '#808080', name: 'Barrier', moveCost: Infinity },
  BOUNDARY: { id: 4, color: '#8b4513', name: 'Boundary', moveCost: Infinity },
};

// ── 内容类型枚举（统一用常量，不再散落裸字符串）─────────────
export const TileContentType = {
  DUNGEON: 'dungeon',
  BOSS: 'boss',
  TREASURE: 'treasure',
  ALTAR: 'altar',
  LIGHTHOUSE: 'lighthouse',
  PORTAL: 'portal',
  NPC: 'npc',
  VILLAGE: 'village',
  MERCHANT: 'merchant',
  RUIN: 'ruin',
  CORRUPTED_DEER: 'corruptedDeer',
};

// ── 共享坐标工具（消除 main.js / GameController.js 里的重复定义）─
/**
 * 轴坐标 (q, r) → 画布像素中心
 * @param {number} q
 * @param {number} r
 * @param {number} size  格子半径（像素）
 * @returns {{ x: number, y: number }}
 */
export function hexToPixel(q, r, size) {
  return {
    x: size * (3 / 2 * q),
    y: size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r),
  };
}

// ── 内容生成器 ───────────────────────────────────────────────

export function makeNPC(name, dialogue = '你好，旅行者！', options = {}) {
  return { type: TileContentType.NPC, name, dialogue, ...options };
}

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
  return { type: TileContentType.ALTAR, name: 'Mysterious Altar', level };
}

export function makeLighthouse(level = 1) {
  return { type: TileContentType.LIGHTHOUSE, name: 'Ancient Lighthouse', level };
}

export function makeVillage(name = '村庄') {
  return { type: TileContentType.VILLAGE, name, dialogue: '欢迎来到村庄。', iconType: 'greenCircle' };
}

export function makeMerchant(name = '旅商') {
  return { type: TileContentType.MERCHANT, name, iconType: 'blueCircle' };
}

export function makeRuin(name = '古代遗迹入口', enemyName = '腐化守卫') {
  return { type: TileContentType.RUIN, name, enemyName, iconType: 'purpleCircle' };
}

export function makeCorruptedDeer(name = '被腐化的鹿') {
  return { type: TileContentType.CORRUPTED_DEER, name, iconType: 'blackCircle' };
}

// ── Tile 类 ──────────────────────────────────────────────────

export class Tile {
  // 提升为静态属性，避免每次 draw() 都重建数组
  static TERRAIN_KEYS = ['grass', 'forest', 'mountain', 'barrier', 'boundary'];

  // 圆圈图标颜色映射，同理提升为静态属性
  static CIRCLE_COLOR_MAP = {
    redCircle: 'red',
    greenCircle: 'green',
    blueCircle: 'blue',
    purpleCircle: 'purple',
    blackCircle: 'black',
  };

  constructor(q, r, type = TileType.GRASS) {
    this.q = q;
    this.r = r;
    this.type = type;
    this.content = null;
    this.isRevealed = false;
    this.variant = Math.floor(Math.random() * 4) + 1;
  }

  getCanvasPos(size) {
    return hexToPixel(this.q, this.r, size);
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

    // 1. 战争迷雾（完全未探索）
    if (visState === 'hidden') {
      hexPath();
      ctx.fillStyle = '#0a0a14';
      ctx.fill();
      return;
    }

    ctx.save();
    hexPath();
    ctx.fillStyle = '#4a7c2c';
    ctx.fill();
    ctx.strokeStyle = '#4a7c2c';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    const imgW = size * 2;
    const imgH = size * Math.sqrt(3);

    // 2. 地形图片
    const terrainKey = `${Tile.TERRAIN_KEYS[this.type.id] ?? 'grass'}_${this.variant}`;
    const terrainImg = DataLoader.getImage(terrainKey);
    if (terrainImg) {
      const bleed = 0.5;
      ctx.drawImage(
        terrainImg,
        x - size - bleed / 2,
        y - imgH / 2 - bleed / 2,
        imgW + bleed,
        imgH + bleed,
      );
    }

    // 3. 内容图标
    if (this.content && visState === 'visible') {
      const { iconType } = this.content;
      if (iconType) {
        const color = Tile.CIRCLE_COLOR_MAP[iconType];
        if (color) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = color;
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
      } else {
        const contentImg = DataLoader.getImage(this.content.type);
        if (contentImg) {
          const scale = 0.92;
          const iw = size * 2 * scale;
          const ih = size * Math.sqrt(3) * scale;
          ctx.drawImage(contentImg, x - iw / 2, y - ih / 2, iw, ih);
        }
      }
    }

    // 4. 选中边框
    if (isSelected) {
      hexPath();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // 5. 已探索但视野外：半透明暗色蒙版
    if (visState === 'explored') {
      hexPath();
      ctx.fillStyle = 'rgba(10, 10, 20, 0.55)';
      ctx.fill();
    }

    // 6. Debug 坐标
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