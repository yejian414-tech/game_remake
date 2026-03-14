// src/world/Tile.js
import { DataLoader } from '../data/DataLoader.js';

// ── 地形类型 ──────────────────────────────────────────────────────
export const TileType = {
  GRASS: { id: 0, color: '#7cfc00', name: 'Plains', moveCost: 1 },
  FOREST: { id: 1, color: '#228b22', name: 'Forest', moveCost: Infinity },
  MOUNTAIN: { id: 2, color: '#8b4513', name: 'Mountains', moveCost: Infinity },
  BARRIER: { id: 3, color: '#808080', name: 'Barrier', moveCost: Infinity },
  BOUNDARY: { id: 4, color: '#8b4513', name: 'Boundary', moveCost: Infinity },
};

// ── 内容类型枚举 ──────────────────────────────────────────────────
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

// ── 共享坐标工具 ──────────────────────────────────────────────────
/**
 * 轴坐标 (q, r) → 画布像素中心（flat-top 布局）
 * x = size * 3/2 * q
 * y = size * (√3/2 * q + √3 * r)
 */
export function hexToPixel(q, r, size) {
  return {
    x: size * (1.5 * q),
    y: size * (Math.SQRT3_HALF * q + Math.SQRT3 * r),
  };
}

// 常用数学常量，避免每帧重复求值
Math.SQRT3 = Math.sqrt(3);
Math.SQRT3_HALF = Math.SQRT3 / 2;

// ── 内容生成器 ────────────────────────────────────────────────────
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

// ── Tile 类 ──────────────────────────────────────────────────────
export class Tile {

  // ── 静态常量：顶点偏移预计算，避免每帧 cos/sin ──────────────────
  static HEX_VERTS = Object.freeze(
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i;
      return [Math.cos(a), Math.sin(a)];
    })
  );

  // ── Path2D 缓存：每个 tileSize 只建一次，后续 ctx.fill/stroke 复用 ──
  // 存储的是以原点为中心的相对路径，绘制前用 ctx.translate 移到格心。
  static _hexPathCache = new Map();

  static getHexPath(size) {
    if (Tile._hexPathCache.has(size)) return Tile._hexPathCache.get(size);
    const p = new Path2D();
    Tile.HEX_VERTS.forEach(([cx, cy], i) => {
      const px = cx * size;
      const py = cy * size;
      i === 0 ? p.moveTo(px, py) : p.lineTo(px, py);
    });
    p.closePath();
    Tile._hexPathCache.set(size, p);
    return p;
  }

  // 地形图片 key 前缀，提升为静态属性避免每次 draw() 重建
  static TERRAIN_KEYS = Object.freeze(['grass', 'forest', 'mountain', 'barrier', 'boundary']);

  // 圆圈图标颜色映射
  static CIRCLE_COLOR_MAP = Object.freeze({
    redCircle: 'red',
    greenCircle: 'green',
    blueCircle: 'blue',
    purpleCircle: 'purple',
    blackCircle: 'black',
  });

  /**
   * @param {number} q
   * @param {number} r
   * @param {TileType} type
   * @param {SeededRandom} [rng]  传入种子随机器以保证地图可复现；
   *                              省略时退回 Math.random（不可复现，仅兼容老代码）。
   */
  constructor(q, r, type = TileType.GRASS, rng = null) {
    this.q = q;
    this.r = r;
    this.type = type;
    this.content = null;
    this.isRevealed = false;
    this.variant = rng
      ? Math.floor(rng.next() * 4) + 1
      : Math.floor(Math.random() * 4) + 1;
  }

  getCanvasPos(size) {
    return hexToPixel(this.q, this.r, size);
  }

  /**
   * 绘制单个 Tile。
   * 调用方需已执行 ctx.save() / ctx.translate(cameraX, cameraY) / ctx.scale(zoom, zoom)。
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number}  size         tileSize
   * @param {boolean} isSelected
   * @param {'visible'|'explored'|'hidden'} visState
   * @param {boolean} debugMode
   */
  draw(ctx, size, isSelected = false, visState = 'visible', debugMode = false) {
    const { x, y } = this.getCanvasPos(size);
    const hexPath = Tile.getHexPath(size);   // 从缓存取，零分配

    // ── 辅助：在 (x,y) 处应用缓存路径 ─────────────────────────────
    const applyPath = () => {
      ctx.save();
      ctx.translate(x, y);
      return hexPath;           // 交由调用方 fill / stroke
    };
    const useHex = (fill) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.fillStyle = fill;
      ctx.fill(hexPath);
      ctx.restore();
    };

    // 1. 战争迷雾（完全未探索）
    if (visState === 'hidden') {
      useHex('#0a0a14');
      return;
    }

    // 2. 底色 + 描边
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#4a7c2c';
    ctx.strokeStyle = '#4a7c2c';
    ctx.lineWidth = 1;
    ctx.fill(hexPath);
    ctx.stroke(hexPath);
    ctx.restore();

    // 3. 地形图片
    const terrainKey = `${Tile.TERRAIN_KEYS[this.type.id] ?? 'grass'}_${this.variant}`;
    const terrainImg = DataLoader.getImage(terrainKey);
    if (terrainImg) {
      const bleed = 0.5;
      const imgW = size * 2 + bleed;
      const imgH = size * Math.SQRT3 + bleed;
      ctx.drawImage(terrainImg, x - size - bleed / 2, y - imgH / 2, imgW, imgH);
    }

    // 4. 内容图标（仅 visible 状态）
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
          const ih = size * Math.SQRT3 * scale;
          ctx.drawImage(contentImg, x - iw / 2, y - ih / 2, iw, ih);
        }
      }
    }

    // 5. 选中边框
    if (isSelected) {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.stroke(hexPath);
      ctx.restore();
    }

    // 6. 已探索但视野外：半透明暗色蒙版
    if (visState === 'explored') {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(10, 10, 20, 0.55)';
      ctx.fill(hexPath);
      ctx.restore();
    }

    // 7. Debug 坐标
    if (debugMode && visState !== 'hidden') {
      ctx.save();
      ctx.font = `${Math.floor(size * 0.45)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      const txt = `(${this.q},${this.r})`;
      ctx.strokeText(txt, x, y);
      ctx.fillText(txt, x, y);
      ctx.restore();
    }
  }
}