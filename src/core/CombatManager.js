// src/core/CombatManager.js
import { rollAttack } from './Dice.js';

export class CombatManager {
  constructor(heroes, enemies, ui) {
    this.heroes = heroes;
    this.enemies = enemies;
    this.ui = ui;
    this.phase = 'START';
    this.turnOrder = [];
    this.activeUnit = null;
    this.logs = ['Battle Start! Encountered enemies!'];
    this.diceInfo = null;
    this.currentAction = null;
  }

  addLog(text) {
      this.logs.unshift(text);
      if (this.logs.length > 10) this.logs.pop();
  }

  notifyUI() { if (this.ui.updateCombatUI) this.ui.updateCombatUI(this); }

  init() {
    this.turnOrder = [...this.heroes, ...this.enemies].sort((a, b) => (b.speed || 0) - (a.speed || 0));
    this.nextTurn();
  }

  _isAlive(unit) { return unit && (typeof unit.isAlive === 'function' ? unit.isAlive() : unit.hp > 0); }

  nextTurn() {
    if (this.turnOrder.length === 0) return;
    this.activeUnit = this.turnOrder.shift();
    this.turnOrder.push(this.activeUnit);
    if (!this._isAlive(this.activeUnit)) return this.nextTurn();

    if (this.activeUnit.frozenTurns && this.activeUnit.frozenTurns > 0) {
        this.activeUnit.frozenTurns--; 
        this.addLog(`❄️ ${this.activeUnit.name} is frozen and cannot move! (${this.activeUnit.frozenTurns} turns left)`);
        this.diceInfo = { isHeal: false, damage: 0, type: 'frozen', targetId: this.activeUnit.id };
        this.phase = 'EXECUTING';
        this.notifyUI();
        return; 
    }

    const isHero = this.heroes.some(h => h.id === this.activeUnit.id);
    this.phase = isHero ? 'PLAYER_TURN' : 'ENEMY_TURN';
    if (!isHero) setTimeout(() => { try { this.handleAI(); } catch (err) { this.addLog(`${this.activeUnit.name} hesitated...`); this.phase = 'EXECUTING'; this.notifyUI(); } }, 1500);
    this.notifyUI();
  }

  selectSkill(skill) {
    if (skill === null) { this.phase = 'PLAYER_TURN'; this.currentAction = null; this.notifyUI(); return; }
    this.currentAction = { skill, attacker: this.activeUnit };
    if (skill.target === 'self' || skill.type === 'heal' || skill.type === 'buff') this.executePlayerAction(this.activeUnit.id);
    else if (skill.target === 'aoe') this.executePlayerAction('aoe_target');
    else { this.phase = 'AWAIT_TARGET'; this.addLog(`Please select a target for [${skill.name}]...`); this.notifyUI(); }
  }

  executePlayerAction(targetId) {
    const { skill, attacker } = this.currentAction;
    this.currentAction.target = targetId === 'aoe_target' ? 'aoe' : (this.enemies.find(e => e.id === targetId) || this.heroes.find(h => h.id === targetId));
    let result = rollAttack(attacker, 0.5, 6);
    let rollVal = Math.max(1, Math.min(6, Math.round(result.sampleRoll)));
    let multiplier = rollVal <= 2 ? 0.5 : rollVal <= 4 ? 1.0 : rollVal === 5 ? 1.2 : 1.5;
    this.currentAction = { ...this.currentAction, multiplier, rollVal, textType: rollVal <= 2 ? 'weak' : rollVal <= 4 ? 'normal' : rollVal === 5 ? 'crit' : 'perfect', isHeal: skill.type === 'heal' || skill.type === 'buff' || skill.name.includes('Heal') || skill.name.includes('Aura') };
    this.diceInfo = { finalRoll: rollVal, desc: "Rolling" };
    this.phase = 'ROLLING';
    this.notifyUI();
  }

  applyDamage() {
      const { skill, target, attacker, multiplier, rollVal, textType, isHeal } = this.currentAction;
      if (isHeal) {
          const healAmount = Math.max(1, Math.floor((attacker.attack || 10) * (skill.power / 100) * multiplier));
          attacker.hp = Math.min(attacker.maxHp || 100, attacker.hp + healAmount);
          this.diceInfo = { isHeal: true, damage: healAmount, targetId: attacker.id };
          this.addLog(`Rolled [${rollVal}] -> Restored ${healAmount} HP ${textType === 'perfect' ? '(Critical!)' : textType === 'weak' ? '(Weak)' : ''}`);
      } else {
          let baseDamage = Math.floor((attacker.attack || 10) * (skill.power / 100) * multiplier);
          let extraDesc = (skill.id === 'slash' || skill.name === 'Slash') && rollVal >= 4 ? '(Double Slash!)' : '';
          if (extraDesc) baseDamage *= 2;
          const isFreezeSkill = skill.id === 'frost_nova' || skill.name.includes('Ice');
          if (target === 'aoe') {
              this.enemies.forEach(e => { if (this._isAlive(e)) { e.hp = Math.max(0, e.hp - Math.max(1, baseDamage - (e.defense || 0))); if (isFreezeSkill) e.frozenTurns = 2; } });
              this.diceInfo = { isHeal: false, damage: baseDamage, type: isFreezeSkill ? 'frozen' : textType, targetId: this.enemies.find(e => this._isAlive(e))?.id };
              this.addLog(`Rolled [${rollVal}] -> AOE! Dealt ${baseDamage} damage ${isFreezeSkill ? '[Group Freeze!]' : ''}`);
          } else {
              let finalDamage = Math.max(1, baseDamage - (target.defense || 0));
              target.hp = Math.max(0, target.hp - finalDamage);
              this.diceInfo = { isHeal: false, damage: finalDamage, type: textType, targetId: target.id };
              this.addLog(`Rolled [${rollVal}] -> Dealt ${finalDamage} damage to ${target.name} ${extraDesc}`);
          }
      }
      this.phase = 'EXECUTING'; this.notifyUI();
  }

  handleAI() {
    const aliveHeroes = this.heroes.filter(h => this._isAlive(h));
    if (aliveHeroes.length === 0) return;
    let target = aliveHeroes.sort((a,b) => a.hp/a.maxHp - b.hp/b.maxHp)[0];
    const usedSkill = this.activeUnit.skillSlots?.[0]?.name || 'Attack';
    let result = rollAttack(this.activeUnit, 0.5, 6);
    let rollVal = Math.max(1, Math.min(6, Math.round(result.sampleRoll)));
    let actualDmg = Math.max(1, Math.floor((this.activeUnit.attack || 12) * (rollVal >= 5 ? 1.5 : 1.0)) - (target.defense || 0));
    target.hp = Math.max(0, target.hp - actualDmg);
    this.addLog(`${this.activeUnit.name} used [${usedSkill}]! Dealt ${actualDmg} damage${rollVal >= 5 ? ' (Crit!)' : ''}`);
    this.diceInfo = { isHeal: false, damage: actualDmg, type: rollVal >= 5 ? 'crit' : 'damage', targetId: target.id };
    this.phase = 'EXECUTING'; this.notifyUI();
  }

  evaluateTurn() {
      this.diceInfo = null;
      if (this.enemies.every(e => !this._isAlive(e))) { this.addLog('All enemies defeated!'); this.phase = 'WIN'; }
      else if (this.heroes.every(h => !this._isAlive(h))) { this.addLog('The party has fallen...'); this.phase = 'LOSE'; }
      else { this.nextTurn(); return; }
      this.notifyUI();
  }

  finishCombat() { if (this.ui.onCombatResult) this.ui.onCombatResult(this.phase === 'WIN' ? 'win' : 'lose'); }
}