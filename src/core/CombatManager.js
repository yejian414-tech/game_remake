// game_remake/src/core/CombatManager.js
import { CombatPhase } from './Constants.js';
import { rollAttack } from './Dice.js';

export class CombatManager {
  constructor(heroes, enemies, ui) {
    this.heroes = heroes;   
    this.enemies = enemies; 
    this.ui = ui;
    this.phase = CombatPhase.TURN_START;
    this.turnOrder = [];
    this.activeUnit = null;
  }

  init() {
    this.turnOrder = [...this.heroes, ...this.enemies]
      .sort((a, b) => (b.speed || 0) - (a.speed || 0));
    this.phase = CombatPhase.TURN_START;
  }

  update() {
    // 只有在回合开始阶段才尝试切换到下一个单位
    if (this.phase === CombatPhase.TURN_START) {
      this.nextTurn();
    }
  }

  nextTurn() {
    if (this.turnOrder.length === 0) return;

    this.activeUnit = this.turnOrder.shift();
    this.turnOrder.push(this.activeUnit);

    // 如果该单位已阵亡，递归寻找下一个，但需防止死循环
    if (!this.activeUnit.isAlive()) {
        return this.nextTurn();
    }

    if (this.activeUnit.type === 'player') {
      this.phase = CombatPhase.AWAIT_PLAYER;
      this.ui.showCombatCommands(this.activeUnit, (skill) => this.handleAction(skill));
    } else {
      this.phase = CombatPhase.EXECUTING;
      // 简单 AI：延迟 1 秒后攻击
      setTimeout(() => this.handleAI(), 1000);
    }
  }

  handleAction(skill) {
    if (this.phase !== CombatPhase.AWAIT_PLAYER) return;
    this.phase = CombatPhase.EXECUTING;
    const target = this.enemies.find(e => e.isAlive());
    if (target) this.executeAttack(this.activeUnit, target, skill);
  }

  handleAI() {
    const target = this.heroes.find(h => h.isAlive());
    if (target) {
        this.executeAttack(this.activeUnit, target, { name: '撞击', power: 100 });
    }
  }

  executeAttack(attacker, target, skill) {
    const result = rollAttack(attacker); 
    const damage = Math.floor((attacker.attack || 10) * (skill.power / 100) * (result.sampleRoll / 10));
    
    target.hp = Math.max(0, target.hp - damage);
    console.log(`${attacker.name} -> ${target.name}: ${damage} 伤害`);

    setTimeout(() => {
      if (this.enemies.every(e => !e.isAlive())) {
        this.phase = CombatPhase.WIN;
        this.ui.onCombatResult('win');
      } else if (this.heroes.every(h => !h.isAlive())) {
        this.phase = CombatPhase.LOSE;
        this.ui.onCombatResult('lose');
      } else {
        this.phase = CombatPhase.TURN_START;
      }
    }, 800);
  }
}