// src/world/Tile.js

// ── 地块地形类型 ─────────────────────────────────────────────
// 游戏初始只有三种基础地形
// MARKET / DUNGEON / TREASURE / BOSS 等扩展地形由事件系统在运行时写入
export const TileType = {
  GRASS: { id: 0, color: '#7cfc00', name: '平原', moveCost: 1 },
  FOREST: { id: 1, color: '#228b22', name: '森林', moveCost: 1 },
  MOUNTAIN: { id: 2, color: '#8b4513', name: '山脉', moveCost: 2 },
};

// ── 地块内容类型 ─────────────────────────────────────────────
/**
 * TileContent 描述格子上放置的"事件对象"，与地形 TileType 解耦。
 *
 * content 对象统一格式：
 *   {
 *     type      : 'dungeon' | 'boss' | 'treasure'
 *     name      : string          // 显示名
 *     level     : number          // 仅 dungeon / boss 有效，默认 1
 *     difficulty: string          // 'EASY'|'NORMAL'|'HARD'|'EXTREME'，仅 dungeon 有效
 *     lootTier  : number          // 仅 treasure 有效，1~3
 *   }
 */
export const TileContentType = {
  DUNGEON: 'dungeon',
  BOSS: 'boss',
  TREASURE: 'treasure',
};

/**
 * 快捷工厂：生成标准地牢内容对象
 * @param {string} name
 * @param {number} level      怪物等级，≥1
 * @param {string} difficulty 'EASY'|'NORMAL'|'HARD'|'EXTREME'
 */
export function makeDungeon(name, level = 1, difficulty = 'NORMAL') {
  return { type: TileContentType.DUNGEON, name, level, difficulty };
}

/**
 * 快捷工厂：生成 Boss 内容对象
 * @param {string} name
 * @param {number} level
 */
export function makeBoss(name, level = 5) {
  return { type: TileContentType.BOSS, name, level, difficulty: 'EXTREME' };
}

/**
 * 快捷工厂：生成宝箱内容对象
 * @param {number} lootTier 1=普通, 2=稀有, 3=史诗
 */
export function makeTreasure(lootTier = 1) {
  const tierName = ['', '普通宝箱', '稀有宝箱', '史诗宝箱'][lootTier] ?? '普通宝箱';
  return { type: TileContentType.TREASURE, name: tierName, lootTier };
}

// ── 地块颜色：内容覆盖在地形色上方的小图标色 ────────────────
const CONTENT_COLORS = {
  [TileContentType.DUNGEON]: '#9400d3',
  [TileContentType.BOSS]: '#ff2222',
  [TileContentType.TREASURE]: '#ffd700',
};

// ── Tile 类 ──────────────────────────────────────────────────
export class Tile {
  /**
   * @param {number} q   轴向坐标 q
   * @param {number} r   轴向坐标 r
   * @param {object} type TileType 中的一项
   */
  constructor(q, r, type = TileType.GRASS) {
    this.q = q;
    this.r = r;
    this.type = type;
    /** @type {null | { type: string, name: string, level?: number, difficulty?: string, lootTier?: number }} */
    this.content = null;
    this.isRevealed = false; // 战争迷雾标记
  }

  // 根据六边形尺寸计算像素中心坐标
  getCanvasPos(size) {
    return {
      x: size * (3 / 2 * this.q),
      y: size * (Math.sqrt(3) / 2 * this.q + Math.sqrt(3) * this.r),
    };
  }

  draw(ctx, size, isSelected = false) {
    const { x, y } = this.getCanvasPos(size);

    // ── 绘制六边形地形 ───────────────────────────────────────
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    ctx.fillStyle = this.type.color;
    ctx.fill();

    ctx.strokeStyle = isSelected ? 'white' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = isSelected ? 3 : 1;
    ctx.stroke();

    // ── 绘制内容图标（仅已探索格子可见）───────────────────────
    if (this.content && this.isRevealed) {
      const iconColor = CONTENT_COLORS[this.content.type] ?? 'red';
      const iconR = size * 0.38;

      ctx.fillStyle = iconColor;
      ctx.beginPath();

      if (this.content.type === TileContentType.TREASURE) {
        // 宝箱：黄色菱形
        ctx.moveTo(x, y - iconR);
        ctx.lineTo(x + iconR, y);
        ctx.lineTo(x, y + iconR);
        ctx.lineTo(x - iconR, y);
        ctx.closePath();
      } else if (this.content.type === TileContentType.BOSS) {
        // Boss：较大红色圆 + 白色 "B"
        ctx.arc(x, y, iconR, 0, Math.PI * 2);
      } else {
        // Dungeon：紫色圆
        ctx.arc(x, y, iconR * 0.8, 0, Math.PI * 2);
      }
      ctx.fill();

      // 在图标上叠加文字标记
      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.round(size * 0.3)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (this.content.type === TileContentType.BOSS) {
        ctx.fillText('B', x, y);
      } else if (this.content.type === TileContentType.DUNGEON) {
        ctx.fillText(`${this.content.level}`, x, y);
      } else if (this.content.type === TileContentType.TREASURE) {
        ctx.fillText('$', x, y);
      }

      ctx.textBaseline = 'alphabetic'; // 还原默认
    }
  }
}