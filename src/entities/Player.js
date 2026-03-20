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
     * Weapon slots — up to 2 weapons the hero carries into battle.
     * Each entry is a full weapon object (from weapons.json) or null.
     * Format: { id, name, type, rarity, statBonus: {…}, skills: [{…}] }
     */
    this.weaponSlots = [null, null];

    /**
     * Index into weaponSlots indicating the currently-equipped weapon.
     * Skills shown in combat come from weaponSlots[equippedWeaponIndex].skills
     */
    this.equippedWeaponIndex = 0;

    /**
     * Equipment slots (armor, trinkets — NOT weapons).
     * 0 = armor/offhand, 1 = accessory
     */
    this.equipSlots = [null, null];

    // Inventory for unequipped items
    this.inventory = [];

    // Store base stats before weapon bonuses so we can recalculate cleanly
    this._baseStrength = this.strength;
    this._baseVitality = this.vitality;
    this._baseAgility = this.agility;
    this._baseIntellect = this.intellect;
    this._baseAwareness = this.awareness;
    this._baseTalent = this.talent;
  }

  // ── Weapon System ────────────────────────────────────────────────

  /**
   * Place a weapon into a weapon slot (0 or 1).
   * Automatically refreshes derived stats.
   * @param {object} weapon  Full weapon object from weapons.json
   * @param {number} slotIndex  0 or 1
   */
  equipWeapon(weapon, slotIndex = 0) {
    const prev = this.weaponSlots[slotIndex];
    this.weaponSlots[slotIndex] = weapon;
    this.refreshDerivedStats();
    return prev;
  }

  /** Remove a weapon from a slot and return it. */
  unequipWeapon(slotIndex) {
    const prev = this.weaponSlots[slotIndex];
    this.weaponSlots[slotIndex] = null;
    this.refreshDerivedStats();
    return prev;
  }

  /**
   * Switch the active weapon to the given slot index.
   * Skills visible in combat will update automatically via getActiveWeapon().
   */
  switchWeapon(slotIndex) {
    if (slotIndex >= 0 && slotIndex < this.weaponSlots.length && this.weaponSlots[slotIndex]) {
      this.equippedWeaponIndex = slotIndex;
      this.refreshDerivedStats();
    }
  }

  /** Returns the currently active weapon object, or null. */
  getActiveWeapon() {
    return this.weaponSlots[this.equippedWeaponIndex] || null;
  }

  /**
   * Returns the skill list of the current weapon.
   * CombatManager / CombatUI should call this instead of hero.skills.
   */
  getActiveSkills() {
    const weapon = this.getActiveWeapon();
    return weapon ? weapon.skills : [];
  }

  // Backward-compat alias so old code that reads hero.skillSlots still works
  get skillSlots() {
    return this.getActiveSkills();
  }

  // ── Equipment (armor / accessories) ─────────────────────────────

  /** Equip an armor/accessory item. Old item returns to inventory. */
  equip(item, slotIndex = 0) {
    const prev = this.equipSlots[slotIndex];
    if (prev) this.inventory.push(prev);
    this.equipSlots[slotIndex] = item;
    this.refreshDerivedStats();
    return prev;
  }

  /** Unequip armor/accessory to inventory. */
  unequip(slotIndex) {
    const item = this.equipSlots[slotIndex];
    if (item) {
      this.equipSlots[slotIndex] = null;
      this.inventory.push(item);
      this.refreshDerivedStats();
    }
    return item;
  }

  // ── Stat Refresh ────────────────────────────────────────────────

  /**
   * Recalculate all derived stats.
   * Starts from base stats stored at construction, then stacks weapon + equipment bonuses.
   */
  refreshDerivedStats() {
    // Reset to base values
    this.strength = this._baseStrength;
    this.vitality = this._baseVitality;
    this.agility = this._baseAgility;
    this.intellect = this._baseIntellect;
    this.awareness = this._baseAwareness;
    this.talent = this._baseTalent;

    // Apply active weapon stat bonus
    const weapon = this.getActiveWeapon();
    if (weapon?.statBonus) {
      const b = weapon.statBonus;
      if (b.strength) this.strength += b.strength;
      if (b.vitality) this.vitality += b.vitality;
      if (b.agility) this.agility += b.agility;
      if (b.intellect) this.intellect += b.intellect;
      if (b.awareness) this.awareness += b.awareness;
      if (b.talent) this.talent += b.talent;
    }

    // Apply armor/accessory stat bonuses
    for (const item of this.equipSlots) {
      if (!item?.statBonus) continue;
      const b = item.statBonus;
      if (b.strength) this.strength += b.strength;
      if (b.vitality) this.vitality += b.vitality;
      if (b.agility) this.agility += b.agility;
      if (b.intellect) this.intellect += b.intellect;
      if (b.awareness) this.awareness += b.awareness;
      if (b.talent) this.talent += b.talent;
    }

    // Derive combat stats from six stats
    this.attack = Math.max(this.strength, this.intellect, this.awareness, this.talent);
    this.defense = Math.round(this.vitality * 0.8);
    this.speed = Math.round(this.agility / 2);
  }

  // ── Drawing ─────────────────────────────────────────────────────



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