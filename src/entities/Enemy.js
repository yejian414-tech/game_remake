// src/entities/Enemy.js
import { Character } from './Character.js';

export class Enemy extends Character {
  constructor(name, type, level) {
    // 根据等级简单计算数值
    const hp = 30 + level * 20;
    super(name, hp, hp);

    this.type = type; // 'wolf', 'skeleton', 'boss' 等
    this.level = level;
  }

  // 敌人在地图上的绘制逻辑
  draw(ctx, size) {
    ctx.save();
    ctx.fillStyle = "#e74c3c"; // 红色代表敌人

    // 绘制一个菱形作为敌人的标志
    ctx.translate(this.x, this.y);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.4);
    ctx.lineTo(size * 0.4, 0);
    ctx.lineTo(0, size * 0.4);
    ctx.lineTo(-size * 0.4, 0);
    ctx.closePath();
    ctx.fill();

    // 绘制等级
    ctx.fillStyle = "white";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`Lv.${this.level}`, 0, 5);
    ctx.restore();
  }
}