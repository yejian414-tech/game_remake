// src/entities/Player.js
import { Character } from './Character.js';
import { DataLoader } from '../data/DataLoader.js';

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
    this.baseStrength = this.strength;
    this.baseToughness = this.toughness;
    this.baseAgility = this.agility;
    this.baseIntellect = this.intellect;
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
    const heroImg = DataLoader.getImage('hero');

    // 1. 创建呼吸灯动画因子 (基于时间)
    // 产生一个在 0.8 到 1.2 之间循环的数值
    const time = Date.now() / 300; 
    const pulse = Math.sin(time) * 0.2 + 1.0; 

    // 2. 绘制脚底强化光环 (Aura)
    // 在绘制图像之前画，确保光环在人物“脚下”
    const auraRadius = size * 1 * pulse; // 光环半径随呼吸灯变化
    const gradient = ctx.createRadialGradient(
        this.x, this.y, 0,           // 内圈中心
        this.x, this.y, auraRadius   // 外圈边缘
    );
    
    // 金色渐变：中心较实，边缘透明
    gradient.addColorStop(0, 'rgba(0, 191, 255, 0.7)');   // 中心：深天蓝 (DeepSkyBlue)
    gradient.addColorStop(0.5, 'rgba(0, 191, 255, 0.3)'); // 中间过渡
    gradient.addColorStop(1, 'rgba(0, 191, 255, 0)');

    ctx.beginPath();
    ctx.fillStyle = gradient;
    ctx.arc(this.x, this.y, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    // 3. 绘制角色图像
    // 保留基本的 shadowBlur 增加人物厚度感
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)'; 

    if (heroImg) {
        const drawW = size * 0.9;
        const drawH = (heroImg.height / heroImg.width) * drawW;
        
        // 人物绘制
        ctx.drawImage(heroImg, this.x - drawW / 2, this.y - drawH * 0.8, drawW, drawH);
        
        // 4. 绘制文字 (Leader) - 位置进一步下移并强化样式
        ctx.shadowBlur = 0; // 关闭文字阴影防止模糊
        
        const textY = this.y + 25; // 坐标进一步下移
        
        ctx.font = 'bold 13px "Arial Black", Gadget, sans-serif'; 
        ctx.textAlign = 'center';
        
        // 绘制加粗描边，增加对比度
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 4;
        ctx.strokeText(this.name, this.x, textY);
        
        // 填充颜色
        ctx.fillStyle = '#f1c40f'; // 使用醒目的明黄色
        ctx.fillText(this.name, this.x, textY);
        
    } else {
        // 兜底逻辑
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI*2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x, this.y + 35);
    }
    
    ctx.restore();
}
}