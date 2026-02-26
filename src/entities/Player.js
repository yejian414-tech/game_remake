// src/entities/Player.js
import { Character } from './Character.js';

export class Player extends Character {
  constructor(name) {
    super(name, 100, 100);
    this.movementPoints = 0;
    this.exp = 0;
    this.level = 1;

    /**
     * 技能槽（4 格）
     * 每格存放 skill 对象或 null
     * 格式：{ id, name, type, target, power, mpCost, cooldown, desc }
     */
    this.skillSlots = [null, null, null, null];

    /**
     * 装备槽（2 格）
     * 每格存放 item 对象或 null
     * 格式：{ id, name, slot, statBonus: { strength, toughness, … }, desc }
     */
    this.equipSlots = [null, null];  // 0 = 主手/护甲, 1 = 副手/饰品

    // 背包（不限格，存放未装备的道具）
    this.inventory = [];
  }

  // ── 技能槽操作 ───────────────────────────────────────────

  /** 将技能装入指定槽位（0-3），已有技能会被替换并返回 */
  equipSkill(skill, slotIndex = 0) {
    const prev = this.skillSlots[slotIndex];
    this.skillSlots[slotIndex] = skill;
    return prev;
  }

  /** 清空指定技能槽，返回被移除的技能 */
  unequipSkill(slotIndex) {
    const prev = this.skillSlots[slotIndex];
    this.skillSlots[slotIndex] = null;
    return prev;
  }

  /** 返回当前所有已装备（非 null）的技能列表 */
  getEquippedSkills() {
    return this.skillSlots.filter(Boolean);
  }

  // ── 装备槽操作 ───────────────────────────────────────────

  /** 装备道具到指定槽位（0-1），旧装备返回背包 */
  equip(item, slotIndex = 0) {
    const prev = this.equipSlots[slotIndex];
    if (prev) this.inventory.push(prev);
    this.equipSlots[slotIndex] = item;
    this.refreshDerivedStats();
    return prev;
  }

  /** 卸下指定槽位装备，放回背包 */
  unequip(slotIndex) {
    const item = this.equipSlots[slotIndex];
    if (item) {
      this.equipSlots[slotIndex] = null;
      this.inventory.push(item);
      this.refreshDerivedStats();
    }
    return item;
  }

  /**
   * 重写 refreshDerivedStats：
   * 先用自身六维基础值，再叠加两个装备槽的 statBonus
   */
  refreshDerivedStats() {
    // 基础派生
    let atk = this.strength;
    let def = this.toughness;
    let spd = Math.round(this.agility / 2);

    // 叠加装备加成
    for (const item of this.equipSlots) {
      if (!item || !item.statBonus) continue;
      const b = item.statBonus;
      atk += (b.strength || 0);
      def += (b.toughness || 0);
      spd += (b.agility || 0);
      // 其余属性直接加到本体（后续可扩展）
      if (b.intellect) this.intellect += b.intellect;
      if (b.awareness) this.awareness += b.awareness;
      if (b.talent) this.talent += b.talent;
    }

    this.attack = atk;
    this.defense = def;
    this.speed = spd;
  }

  // ── 绘制 ─────────────────────────────────────────────────

  draw(ctx, size) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'white';
    ctx.fillStyle = '#3498db';
    ctx.beginPath();
    ctx.arc(this.x, this.y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x, this.y - size * 0.7);
    ctx.restore();
  }
}