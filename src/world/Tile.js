// src/world/Tile.js

export const TileType = {
  GRASS: { id: 0, color: '#7cfc00', name: '平原', moveCost: 1 },
  FOREST: { id: 1, color: '#228b22', name: '森林', moveCost: 1 },
  MOUNTAIN: { id: 2, color: '#8b4513', name: '山脉', moveCost: 2 },
};

export const TileContentType = {
  DUNGEON: 'dungeon',
  BOSS: 'boss',
  TREASURE: 'treasure',
};

export function makeDungeon(name, level = 1, difficulty = 'NORMAL') {
  return { type: TileContentType.DUNGEON, name, level, difficulty };
}

export function makeBoss(name, level = 5) {
  return { type: TileContentType.BOSS, name, level, difficulty: 'EXTREME' };
}

export function makeTreasure(lootTier = 1) {
  const tierName = ['', '普通宝箱', '稀有宝箱', '史诗宝箱'][lootTier] ?? '普通宝箱';
  return { type: TileContentType.TREASURE, name: tierName, lootTier };
}

const CONTENT_COLORS = {
  [TileContentType.DUNGEON]: '#9400d3',
  [TileContentType.BOSS]: '#ff2222',
  [TileContentType.TREASURE]: '#ffd700',
};

export class Tile {
  constructor(q, r, type = TileType.GRASS) {
    this.q = q;
    this.r = r;
    this.type = type;
    this.content = null;
    this.isRevealed = false;
  }

  getCanvasPos(size) {
    return {
      x: size * (3 / 2 * this.q),
      y: size * (Math.sqrt(3) / 2 * this.q + Math.sqrt(3) * this.r),
    };
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} size
   * @param {boolean} isSelected
   * @param {'hidden'|'explored'|'visible'} visState
   */
  draw(ctx, size, isSelected = false, visState = 'visible') {
    const { x, y } = this.getCanvasPos(size);

    // ── 辅助：绘制六边形路径 ────────────────────────────────
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

    // ── 完全未探索：只画黑格，早退 ─────────────────────────
    if (visState === 'hidden') {
      hexPath();
      ctx.fillStyle = '#0a0a14';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      return;
    }

    // ── 已探索 / 可见：正常绘制地形 ────────────────────────
    hexPath();
    ctx.fillStyle = this.type.color;
    ctx.fill();
    ctx.strokeStyle = isSelected ? 'white' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = isSelected ? 3 : 1;
    ctx.stroke();

    // ── 内容图标（只在可见状态下显示，explored 时隐藏内容）──
    if (this.content && visState === 'visible') {
      const iconColor = CONTENT_COLORS[this.content.type] ?? 'red';
      const iconR = size * 0.38;

      ctx.fillStyle = iconColor;
      ctx.beginPath();

      if (this.content.type === TileContentType.TREASURE) {
        ctx.moveTo(x, y - iconR);
        ctx.lineTo(x + iconR, y);
        ctx.lineTo(x, y + iconR);
        ctx.lineTo(x - iconR, y);
        ctx.closePath();
      } else if (this.content.type === TileContentType.BOSS) {
        ctx.arc(x, y, iconR, 0, Math.PI * 2);
      } else {
        ctx.arc(x, y, iconR * 0.8, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.font = `bold ${Math.round(size * 0.3)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (this.content.type === TileContentType.BOSS) ctx.fillText('B', x, y);
      else if (this.content.type === TileContentType.DUNGEON) ctx.fillText(`${this.content.level}`, x, y);
      else if (this.content.type === TileContentType.TREASURE) ctx.fillText('$', x, y);

      ctx.textBaseline = 'alphabetic';
    }

    // ── 已探索但视野外：叠半透明暗色蒙版 ──────────────────
    if (visState === 'explored') {
      hexPath();
      ctx.fillStyle = 'rgba(10, 10, 20, 0.55)';
      ctx.fill();
    }
  }
}