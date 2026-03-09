// src/entities/Enemy.js
import { Character } from './Character.js';

/**
 * Enemy core stats scale automatically by level, but can be overridden
 * item by item via statOverrides in the constructor.
 *
 * Base stats (level=1) have been rebalanced to prevent "unhittable" scenarios:
 * strength   12 -> +4/level
 * toughness   5 -> +1.5/level (Nerfed heavily so players can deal damage)
 * intellect   6 -> +2/level
 * awareness   8 -> +2/level
 * talent      5 -> +1/level
 * agility     8 -> +2/level
 */
export class Enemy extends Character {
  /**
   * @param {string} name
   * @param {string} type  'wolf' | 'skeleton' | 'boss' etc.
   * @param {number} level
   * @param {object} [statOverrides] Overrides specific base stats, used for bosses / elites
   * @param {string} [difficultyMode] 'normal' or 'hell'
   */
  constructor(name, type, level, statOverrides = {}, difficultyMode = 'normal') {

    // --- 🔴 Dynamic Rebalanced Multipliers ---
    // HP: Standard boost for difficulty
    const hpMulti = difficultyMode === 'hell' ? 1.8 : 1.0;

    // ATTACK: Massive boost in hell mode to make them deadly
    const atkMulti = difficultyMode === 'hell' ? 2.5 : 1.0;

    // DEFENSE: Nerfed significantly! Hell mode slightly buffs it (1.2), Normal mode nerfs it (0.6)
    const defMulti = difficultyMode === 'hell' ? 1.2 : 0.6;

    // Calculate scaled HP
    const hp = Math.floor((30 + level * 20) * hpMulti);
    super(name, hp, hp);

    this.type = 'enemy';     // Keep consistent with CombatManager checks
    this.monsterType = type; // Store original type
    this.level = level;
    this.difficulty = difficultyMode; // Save difficulty for rendering

    // Apply ATTACK multipliers to offensive stats
    this.strength = Math.floor((statOverrides.strength ?? (12 + (level - 1) * 4)) * atkMulti);
    this.intellect = Math.floor((statOverrides.intellect ?? (6 + (level - 1) * 2)) * atkMulti);

    // Apply DEFENSE multipliers to defensive stats (Heavily nerfed base scaling)
    this.toughness = Math.floor((statOverrides.toughness ?? (5 + (level - 1) * 1.5)) * defMulti);

    // Apply Standard multipliers to utility stats
    this.awareness = Math.floor((statOverrides.awareness ?? (8 + (level - 1) * 2)) * hpMulti);
    this.talent = Math.floor((statOverrides.talent ?? (5 + (level - 1) * 1)) * hpMulti);
    this.agility = Math.floor((statOverrides.agility ?? (8 + (level - 1) * 2)) * hpMulti);

    // Refresh derived stats from Character.js (attack / defense / speed)
    this.refreshDerivedStats();

    // 🔴 FATAL ATTACK BOOST (Make them hit harder)
    if (this.difficulty === 'hell') {
        this.attack = Math.floor((this.attack || 15) * 1.5);
    }

    // 🔴 GUARANTEED DEFENSE SQUISH (Make them vulnerable)
    // No matter how high their toughness is, force their final defense to be 40% of the calculated value.
    // This guarantees that players will never hit for '0' damage constantly.
    this.defense = Math.floor((this.defense || 0) * 0.4);
  }

  // --- Rendering on the Hex Map ---

  draw(ctx, size) {
    ctx.save();

    // Hell mode enemies are rendered in a darker blood-red color
    ctx.fillStyle = this.difficulty === 'hell' ? '#8b0000' : '#e74c3c';

    // Draw diamond shape body
    ctx.translate(this.x, this.y);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.4);
    ctx.lineTo(size * 0.4, 0);
    ctx.lineTo(0, size * 0.4);
    ctx.lineTo(-size * 0.4, 0);
    ctx.closePath();
    ctx.fill();

    // Draw level tag
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';

    // Add fire emoji for hell mode
    const tag = this.difficulty === 'hell' ? `🔥Lv.${this.level}` : `Lv.${this.level}`;
    ctx.fillText(tag, 0, 4);

    ctx.restore();
  }
}