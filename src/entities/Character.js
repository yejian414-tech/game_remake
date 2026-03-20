// src/entities/Character.js
export class Character {
  constructor(name, hp, maxHp) {
    this.name = name;
    this.hp = hp;
    this.maxHp = maxHp;

    // ── Six Core Stats (aligned with game design doc) ──────────────
    /** Strength STR: Accuracy & damage with bladed/blunt weapons, physical challenges */
    this.strength = 10;
    /** Vitality VIT: Drives base HP, stamina challenges */
    this.vitality = 10;
    /** Intelligence INT: Accuracy & damage with wands/staves, puzzle solving */
    this.intellect = 10;
    /** Awareness AWR: Accuracy with bows/polearms, ambush launch/prevention */
    this.awareness = 10;
    /** Talent TAL: Accuracy with certain weapons, boat movement, trap disarming */
    this.talent = 10;
    /** Agility AGI: Speed, evasion, crit rate */
    this.agility = 10;

    // Derived combat stats (refreshed via refreshDerivedStats)
    this.attack = this.strength;   // backward compat with Dice / CombatManager
    this.defense = this.vitality;
    this.speed = this.agility;

    this.type = 'neutral';
    this.q = 0; this.r = 0;
    this.x = 0; this.y = 0;
    this.targetX = 0; this.targetY = 0;
  }

  /**
   * Recalculate derived stats from the six core stats.
   * Call after equipping/unequipping weapons or applying buffs.
   *
   * Derivation rules:
   *   attack  = strength  (physical weapons scale off STR)
   *   defense = vitality  (VIT drives durability / damage reduction)
   *   speed   = agility/2 (AGI determines turn order)
   *   maxHp   = base + vitality * 3 (VIT inflates HP pool)
   */
  refreshDerivedStats() {
    this.attack = this.strength;
    this.defense = Math.round(this.vitality * 0.8);
    this.speed = Math.round(this.agility / 2);
  }

  update(_deltaTime) {
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