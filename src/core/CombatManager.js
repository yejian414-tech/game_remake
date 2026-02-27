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

    this.logs = ['战斗开始！遭遇了敌人！'];
    this.diceInfo = null;
    this.currentAction = null;
  }

  addLog(text) {
      this.logs.unshift(text);
      if (this.logs.length > 10) this.logs.pop();
  }

  notifyUI() {
      if (this.ui.updateCombatUI) this.ui.updateCombatUI(this);
  }

  init() {
    this.turnOrder = [...this.heroes, ...this.enemies].sort((a, b) => (b.speed || 0) - (a.speed || 0));
    this.nextTurn();
  }

  update() { }

  startGame() {
    this.nextTurn();
  }

  _isAlive(unit) {
      if (!unit) return false;
      if (typeof unit.isAlive === 'function') return unit.isAlive();
      return unit.hp > 0;
  }

  nextTurn() {
    if (this.turnOrder.length === 0) return;
    this.activeUnit = this.turnOrder.shift();
    this.turnOrder.push(this.activeUnit);

    if (!this._isAlive(this.activeUnit)) return this.nextTurn();

    // 🧊 核心机制：冰冻状态判定
    if (this.activeUnit.frozenTurns && this.activeUnit.frozenTurns > 0) {
        this.activeUnit.frozenTurns--; // 扣除一回合冰冻时间
        this.addLog(`❄️ ${this.activeUnit.name} 被冻成了冰块，无法行动！(剩余 ${this.activeUnit.frozenTurns} 回合)`);

        // 发送给 UI 播放“冰冻跳过”特效，然后直接把状态切入执行完毕，跳过他的回合
        this.diceInfo = { isHeal: false, damage: 0, type: 'frozen', targetId: this.activeUnit.id };
        this.phase = 'EXECUTING';
        this.notifyUI();
        return; // ⚠️ 提前退出，绝不执行后续的玩家/AI逻辑！
    }

    const isHero = this.heroes.some(h => h.id === this.activeUnit.id);

    if (isHero) {
      this.phase = 'PLAYER_TURN';
    } else {
      this.phase = 'ENEMY_TURN';

      setTimeout(() => {
          try {
              this.handleAI();
          } catch (err) {
              console.error("【AI报错拦截】:", err);
              this.addLog(`${this.activeUnit.name} 犹豫了一下...`);
              this.phase = 'EXECUTING';
              this.notifyUI();
          }
      }, 1500);
    }
    this.notifyUI();
  }

  selectSkill(skill) {
    if (skill === null) {
        this.phase = 'PLAYER_TURN';
        this.currentAction = null;
        this.notifyUI();
        return;
    }
    this.currentAction = { skill, attacker: this.activeUnit };

    if (skill.target === 'self' || skill.type === 'heal' || skill.type === 'buff') {
        this.executePlayerAction(this.activeUnit.id);
    }
    else if (skill.target === 'aoe') {
        this.executePlayerAction('aoe_target');
    }
    else {
        this.phase = 'AWAIT_TARGET';
        this.addLog(`请选择 [${skill.name}] 的目标...`);
        this.notifyUI();
    }
  }

  executePlayerAction(targetId) {
    const { skill, attacker } = this.currentAction;

    let target;
    if (targetId === 'aoe_target') {
        target = 'aoe';
    } else {
        target = this.enemies.find(e => e.id === targetId) || this.heroes.find(h => h.id === targetId);
    }

    this.currentAction.target = target;

    let rollVal = 3;
    try {
        const result = rollAttack(attacker, 0.5, 6);
        rollVal = Math.max(1, Math.min(6, Math.round(result.sampleRoll)));
    } catch (err) {
        rollVal = Math.floor(Math.random() * 6) + 1;
    }

    let multiplier = 1;
    let textType = 'normal';

    if (rollVal <= 2) { multiplier = 0.5; textType = 'weak'; }
    else if (rollVal <= 4) { multiplier = 1.0; textType = 'normal'; }
    else if (rollVal === 5) { multiplier = 1.2; textType = 'crit'; }
    else { multiplier = 1.5; textType = 'perfect'; }

    this.currentAction = {
        ...this.currentAction,
        multiplier, rollVal, textType,
        isHeal: skill.type === 'heal' || skill.type === 'buff' || skill.name.includes('恢复') || skill.name.includes('光环')
    };

    this.diceInfo = { finalRoll: rollVal, desc: "掷骰" };
    this.phase = 'ROLLING';
    this.notifyUI();
  }

  applyDamage() {
      const { skill, target, attacker, multiplier, rollVal, textType, isHeal } = this.currentAction;

      if (isHeal) {
          const healAmount = Math.max(1, Math.floor((attacker.attack || 10) * (skill.power / 100) * multiplier));
          attacker.hp = Math.min(attacker.maxHp || 100, attacker.hp + healAmount);

          let extraDesc = textType === 'perfect' ? '(大成功!)' : textType === 'weak' ? '(效果微弱)' : '';
          this.diceInfo = { isHeal: true, damage: healAmount, targetId: attacker.id };
          this.addLog(`骰出 [${rollVal}] -> 恢复了 ${healAmount} 点生命 ${extraDesc}`);
      } else {
          let baseDamage = Math.floor((attacker.attack || 10) * (skill.power / 100) * multiplier);
          let extraDesc = '';

          if ((skill.id === 'slash' || skill.name === '斩击') && rollVal >= 4) {
              baseDamage *= 2;
              extraDesc = '(触发二连斩!)';
              this.currentAction.textType = 'crit';
          }

          let statusDesc = textType === 'weak' ? '(偏斜)' : textType === 'perfect' ? '(完美一击!)' : '';

          if (target === 'aoe') {
              const firstEnemy = this.enemies.find(e => this._isAlive(e));
              const animTargetId = firstEnemy ? firstEnemy.id : null;

              // 🧊 识别是否为冰冻技能（支持根据名字或ID判断）
              const isFreezeSkill = skill.id === 'frost_nova' || skill.name.includes('冰');

              this.enemies.forEach(e => {
                  if (this._isAlive(e)) {
                      let finalDmg = Math.max(1, baseDamage - (e.defense || 0));
                      e.hp = Math.max(0, e.hp - finalDmg);

                      // 如果是冰冻技能，给所有敌人打上两回合的冰冻标记
                      if (isFreezeSkill) {
                          e.frozenTurns = 2;
                      }
                  }
              });

              if (isFreezeSkill) statusDesc += ' [群体冰冻!]';

              // 传给UI type: 'frozen'，触发炫酷冰冻特效
              this.diceInfo = {
                  isHeal: false,
                  damage: baseDamage,
                  type: isFreezeSkill ? 'frozen' : this.currentAction.textType,
                  targetId: animTargetId
              };
              this.addLog(`骰出 [${rollVal}] -> 释放群伤！对所有敌人造成 ${baseDamage} 伤害 ${statusDesc}`);
          } else {
              let finalDamage = Math.max(1, baseDamage - (target.defense || 0));
              target.hp = Math.max(0, target.hp - finalDamage);

              this.diceInfo = { isHeal: false, damage: finalDamage, type: this.currentAction.textType, targetId: target.id };
              this.addLog(`骰出 [${rollVal}] -> 对 ${target.name} 造成 ${finalDamage} 伤害 ${statusDesc} ${extraDesc}`);
          }
      }

      this.phase = 'EXECUTING';
      this.notifyUI();
  }

  handleAI() {
    const aliveHeroes = this.heroes.filter(h => this._isAlive(h));
    if (aliveHeroes.length === 0) return;

    let target = aliveHeroes[0];
    if (Math.random() < 0.7) {
        let minHpRatio = target.hp / (target.maxHp || 100);
        aliveHeroes.forEach(p => {
            if (p.hp / (p.maxHp || 100) < minHpRatio) {
                minHpRatio = p.hp / (p.maxHp || 100);
                target = p;
            }
        });
    } else {
        target = aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)];
    }

    const usedSkill = (this.activeUnit.skillSlots && this.activeUnit.skillSlots[0])
        ? this.activeUnit.skillSlots[0].name
        : '突袭';

    let rollVal = 3;
    let isCrit = false;

    try {
        const result = rollAttack(this.activeUnit, 0.5, 6);
        rollVal = Math.max(1, Math.min(6, Math.round(result.sampleRoll)));
        isCrit = rollVal >= 5;
    } catch (err) {
        rollVal = Math.floor(Math.random() * 6) + 1;
        isCrit = rollVal >= 5;
    }

    const floatMultiplier = 0.9 + Math.random() * 0.3;
    let baseDmg = Math.floor((this.activeUnit.attack || 12) * floatMultiplier);

    let dmgToApply = isCrit ? Math.floor(baseDmg * 1.5) : baseDmg;
    let actualDmg = Math.max(1, dmgToApply - (target.defense || 0));

    target.hp = Math.max(0, target.hp - actualDmg);

    this.addLog(`${this.activeUnit.name} 使用了 [${usedSkill}]！造成 ${actualDmg} 伤害${isCrit ? ' (暴击!)' : ''}`);

    this.diceInfo = { isHeal: false, damage: actualDmg, type: isCrit ? 'crit' : 'damage', targetId: target.id };
    this.phase = 'EXECUTING';
    this.notifyUI();
  }

  evaluateTurn() {
      this.diceInfo = null;

      if (this.enemies.every(e => !this._isAlive(e))) {
          this.addLog('所有敌人都被打败了！');
          this.phase = 'WIN';
      } else if (this.heroes.every(h => !this._isAlive(h))) {
          this.addLog('队伍全军覆没...');
          this.phase = 'LOSE';
      } else {
          this.nextTurn();
          return;
      }
      this.notifyUI();
  }

  finishCombat() {
      if (this.ui.onCombatResult) {
          this.ui.onCombatResult(this.phase === 'WIN' ? 'win' : 'lose');
      }
  }
}