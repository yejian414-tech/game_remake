// src/entities/Enemy.js
import { Character } from './Character.js';

/**
 * Enemy core stats scale automatically by level, but can be overridden
 * item by item via statOverrides in the constructor.
 *
 * Base stats (level=1):
 * strength  12  -> +4/level
 * toughness  8  -> +3/level
 * intellect  6  -> +2/level
 * awareness  8  -> +2/level
 * talent     5  -> +1/level
 * agility    8  -> +2/level
 */
export class Enemy extends Character {
  /**
   * @param {string} name
   * @param {string} type  'wolf' | 'skeleton' | 'boss' etc.
   * @param {number} level
   * @param {object} [statOverrides]  Overrides specific base stats, used for bosses / elites
   * @param {string} [difficultyMode] 'normal' or 'hell'
   */
  constructor(name, type, level, statOverrides = {}, difficultyMode = 'normal') {

    // Calculate multiplier based on difficulty (Hell mode = 1.8x stats)
    const multi = difficultyMode === 'hell' ? 1.8 : 1.0;

    // Apply multiplier to HP
    const hp = Math.floor((30 + level * 20) * multi);
    super(name, hp, hp);

    this.type = 'enemy';   // Keep consistent with CombatManager
    this.monsterType = type; // Store original type
    this.level = level;
    this.difficulty = difficultyMode; // Save difficulty for rendering

    // Apply multiplier to the six core stats
    this.strength = Math.floor((statOverrides.strength ?? (12 + (level - 1) * 4)) * multi);
    this.toughness = Math.floor((statOverrides.toughness ?? (8 + (level - 1) * 3)) * multi);
    this.intellect = Math.floor((statOverrides.intellect ?? (6 + (level - 1) * 2)) * multi);
    this.awareness = Math.floor((statOverrides.awareness ?? (8 + (level - 1) * 2)) * multi);
    this.talent = Math.floor((statOverrides.talent ?? (5 + (level - 1) * 1)) * multi);
    this.agility = Math.floor((statOverrides.agility ?? (8 + (level - 1) * 2)) * multi);

    // Refresh derived stats (attack / defense / speed)
    this.refreshDerivedStats();
  }

  // --- Rendering ---

  draw(ctx, size) {
    ctx.save();

    // Hell mode enemies are rendered in a darker red color
    ctx.fillStyle = this.difficulty === 'hell' ? '#8b0000' : '#e74c3c';

    // Draw diamond shape
    ctx.translate(this.x, this.y);
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.4);
    ctx.lineTo(size * 0.4, 0);
    ctx.lineTo(0, size * 0.4);
    ctx.lineTo(-size * 0.4, 0);
    ctx.closePath();
    ctx.fill();

    // Draw level tag with fire emoji for hell mode
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    const tag = this.difficulty === 'hell' ? `🔥Lv.${this.level}` : `Lv.${this.level}`;
    ctx.fillText(tag, 0, 4);

    ctx.restore();
  }
}