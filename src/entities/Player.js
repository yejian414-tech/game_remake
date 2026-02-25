// src/entities/Player.js
import { Character } from './Character.js';

export class Player extends Character {
  constructor(name) {
    super(name, 100, 100);
    this.movementPoints = 0; // 当前剩余行动力
    this.exp = 0;
    this.level = 1;
    this.inventory = [];
  }

  draw(ctx, size) {
    ctx.save();
    // 绘制玩家占位符（例如一个带边框的圆或角色图片）
    ctx.shadowBlur = 10;
    ctx.shadowColor = "white";

    ctx.fillStyle = "#3498db"; // 蓝色代表玩家
    ctx.beginPath();
    ctx.arc(this.x, this.y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 绘制名字
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.name, this.x, this.y - size * 0.7);
    ctx.restore();
  }
}