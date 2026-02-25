// src/world/Tile.js
export const TileType = {
  GRASS: { id: 0, color: '#7cfc00', name: '平原' },
  FOREST: { id: 1, color: '#228b22', name: '森林' },
  MOUNTAIN: { id: 2, color: '#8b4513', name: '山脉' },
  MARKET: { id: 3, color: '#ffd700', name: '集市' },
  DUNGEON: { id: 4, color: '#4b0082', name: '地牢' }
};

export class Tile {
  constructor(q, r, type = TileType.GRASS) {
    this.q = q; // 轴向坐标 q
    this.r = r; // 轴向坐标 r
    this.type = type;
    this.content = null; // 存放 Enemy 或 Item 实例
    this.isRevealed = false; // 战争迷雾标记
  }

  // 根据六边形尺寸计算其像素中心坐标
  getCanvasPos(size) {
    const x = size * (3 / 2 * this.q);
    const y = size * (Math.sqrt(3) / 2 * this.q + Math.sqrt(3) * this.r);
    return { x, y };
  }

  draw(ctx, size, isSelected = false) {
    const { x, y } = this.getCanvasPos(size);

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    // 填充颜色
    ctx.fillStyle = this.type.color;
    ctx.fill();

    // 绘制边框
    ctx.strokeStyle = isSelected ? 'white' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = isSelected ? 3 : 1;
    ctx.stroke();

    // 如果有内容（如敌人）在这里绘制简易占位符
    if (this.content) {
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}