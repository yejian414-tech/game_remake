// src/entities/Character.js
export class Character {
  constructor(name, hp, maxHp) {
    this.name = name;
    this.hp = hp;
    this.maxHp = maxHp;

    // 逻辑坐标 (Hex Axial Coordinates)
    this.q = 0;
    this.r = 0;

    // 视觉坐标 (用于 Canvas 渲染，实现平滑过渡)
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
  }

  // 更新位置（带简单的插值动画）
  update(deltaTime) {
    const lerpSpeed = 0.1;
    this.x += (this.targetX - this.x) * lerpSpeed;
    this.y += (this.targetY - this.y) * lerpSpeed;
  }

  setGridPos(q, r, map) {
    this.q = q;
    this.r = r;
    // 从地图中获取该格子的像素中心点
    const pos = map.getTile(q, r).getCanvasPos(map.tileSize);
    this.targetX = pos.x;
    this.targetY = pos.y;

    // 如果是第一次设置位置，直接同步视觉坐标
    if (this.x === 0 && this.y === 0) {
      this.x = this.targetX;
      this.y = this.targetY;
    }
  }

  isAlive() {
    return this.hp > 0;
  }
}