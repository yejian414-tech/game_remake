// src/entities/Enemy.js
import { Character } from './Character.js';

/**
 * 敌人六维属性按等级自动缩放，也可在构造时传入 statOverrides 逐项覆盖。
 *
 * 属性基准（level=1）：
 *   strength  12  → 随等级 +4/级
 *   toughness  8  → +3/级
 *   intellect  6  → +2/级
 *   awareness  8  → +2/级
 *   talent     5  → +1/级
 *   agility    8  → +2/级
 */
export class Enemy extends Character {
  /**
   * @param {string} name
   * @param {string} type  'wolf' | 'skeleton' | 'boss' 等
   * @param {number} level
   * @param {object} [statOverrides]  覆盖个别基础属性，用于 boss / 精英怪
   */
  constructor(name, type, level, statOverrides = {}) {
    const hp = 30 + level * 20;
    super(name, hp, hp);

    this.type = 'enemy';   // 保持与 CombatManager 判断一致
    this.monsterType = type; // 保存原始 type（'wolf' / 'boss' 等）
    this.level = level;

    // ── 六维属性（按等级缩放后可被 statOverrides 覆盖）───────
    this.strength = statOverrides.strength ?? (12 + (level - 1) * 4);
    this.toughness = statOverrides.toughness ?? (8 + (level - 1) * 3);
    this.intellect = statOverrides.intellect ?? (6 + (level - 1) * 2);
    this.awareness = statOverrides.awareness ?? (8 + (level - 1) * 2);
    this.talent = statOverrides.talent ?? (5 + (level - 1) * 1);
    this.agility = statOverrides.agility ?? (8 + (level - 1) * 2);

    // 刷新派生属性（attack / defense / speed）
    this.refreshDerivedStats();
  }

  // ── 绘制 ─────────────────────────────────────────────────

  draw(ctx, size) {
    ctx.save();
    ctx.fillStyle = '#e74c3c';

    // 菱形
    ctx.translate(this.x, this.y);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.4);
    ctx.lineTo(size * 0.4, 0);
    ctx.lineTo(0, size * 0.4);
    ctx.lineTo(-size * 0.4, 0);
    ctx.closePath();
    ctx.fill();

    // 等级标签
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Lv.${this.level}`, 0, 4);
    ctx.restore();
  }
}