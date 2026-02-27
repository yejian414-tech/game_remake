// game/src/entities/Character.js
export class Character {
  constructor(name, hp, maxHp) {
    this.name = name;
    this.hp = hp;
    this.maxHp = maxHp;

    // ── 六维基础属性 ─────────────────────────────────────────
    /** 力量 STR：物理伤害、负重 */
    this.strength = 10;
    /** 韧性 TOU：物理防御、HP 加成 */
    this.toughness = 10;
    /** 智力 INT：魔法伤害、技能效果 */
    this.intellect = 10;
    /** 意识 AWR：先手判定、侦察、抗控 */
    this.awareness = 10;
    /** 才艺 TAL：特殊技能、光环、辅助 */
    this.talent = 10;
    /** 敏捷 AGI：速度、闪避、暴击率 */
    this.agility = 10;

    // 派生属性（由六维映射，随时可通过 refreshDerivedStats 刷新）
    this.attack = this.strength;   // 向下兼容 Dice / CombatManager
    this.defense = this.toughness;
    this.speed = this.agility;

    this.type = 'neutral';
    this.q = 0; this.r = 0;
    this.x = 0; this.y = 0;
    this.targetX = 0; this.targetY = 0;
  }

  /**
   * 根据六维属性刷新派生值。
   * 在实例化/装备变动/增益结算后调用一次即可。
   */
  refreshDerivedStats() {
    this.attack = this.strength;
    this.defense = this.toughness;
    this.speed = Math.round(this.agility / 2);
  }

  update(deltaTime) {
    const lerpSpeed = 0.1;
    this.x += (this.targetX - this.x) * lerpSpeed;
    this.y += (this.targetY - this.y) * lerpSpeed;
  }

  setGridPos(q, r, map) {
    this.q = q; this.r = r;
    const pos = map.getTile(q, r).getCanvasPos(map.tileSize);
    this.targetX = pos.x; this.targetY = pos.y;
    if (this.x === 0 && this.y === 0) {
      this.x = this.targetX; this.y = this.targetY;
    }
  }

  isAlive() { return this.hp > 0; }
}