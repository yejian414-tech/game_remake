// src/core/CombatManager.js
import { CombatPhase } from './Constants.js';
import { rollAttack } from './Dice.js'; 

export class CombatManager {
  constructor(heroes, enemies, ui) {
    this.heroes = heroes;   
    this.enemies = enemies; 
    this.ui = ui;
    this.phase = CombatPhase.START;
    this.turnOrder = [];
    this.activeUnit = null;
    
    // UI 数据绑定
    this.logs = ['战斗开始！遭遇了敌人！'];
    this.diceInfo = null; 
    this.currentAction = null; 
  }

  addLog(text) {
      this.logs.unshift(text);
      if (this.logs.length > 10) this.logs.pop();
  }

  // 通知 UI 管理器，将最新数据推给 React 组件
  notifyUI() { 
      if (this.ui.updateCombatUI) this.ui.updateCombatUI(this); 
  }

  init() {
    this.turnOrder = [...this.heroes, ...this.enemies].sort((a, b) => (b.speed || 0) - (a.speed || 0));
    this.phase = CombatPhase.START;
    this.notifyUI();
  }

  update() {
    // 原版通过 update 轮询，现在完全由 React 动画结束后的回调驱动！
  }

  // 玩家点击“开始战斗”后触发
  startGame() {
    this.nextTurn();
  }

  nextTurn() {
    if (this.turnOrder.length === 0) return;
    this.activeUnit = this.turnOrder.shift();
    this.turnOrder.push(this.activeUnit);

    if (!this.activeUnit.isAlive()) return this.nextTurn();

    if (this.activeUnit.type === 'player') {
      this.phase = CombatPhase.PLAYER_TURN;
    } else {
      this.phase = CombatPhase.ENEMY_TURN;
      // 怪物思考 1.5 秒后行动，留给玩家反应时间
      setTimeout(() => this.handleAI(), 1500); 
    }
    this.notifyUI();
  }

  // React 点击技能按钮后回调
  selectSkill(skill) {
    if (skill === null) {
        this.phase = CombatPhase.PLAYER_TURN;
        this.currentAction = null;
        this.notifyUI();
        return;
    }
    this.currentAction = { skill, attacker: this.activeUnit };
    
    // 如果是自己/群体技能，直接执行；否则等玩家点击目标
    if (skill.target === 'self' || skill.type === 'heal' || skill.target === 'aoe') {
        this.executePlayerAction(this.activeUnit.id);
    } else {
        this.phase = CombatPhase.AWAIT_TARGET;
        this.addLog(`请选择 [${skill.name}] 的目标...`);
        this.notifyUI();
    }
  }

  // 确认目标后，开始摇骰子
  executePlayerAction(targetId) {
    const { skill, attacker } = this.currentAction;
    const target = this.enemies.find(e => e.id === targetId) || this.heroes.find(h => h.id === targetId);
    this.currentAction.target = target;
    
    // ====== 【关键点】融合组员的 Dice.js ======
    // 使用正态分布投骰子！限定最高 6 点，以完美匹配你的 React 视觉效果
    const result = rollAttack(attacker, 0.5, 6);
    
    let multiplier = 1;
    let textType = 'normal';
    // 强制将结果收敛到 1-6 的整数区间
    let rollVal = Math.max(1, Math.min(6, Math.round(result.sampleRoll)));

    // 完美复刻你原本的骰子阶梯判定
    if (rollVal <= 2) { multiplier = 0.5; textType = 'weak'; }
    else if (rollVal <= 4) { multiplier = 1.0; textType = 'normal'; }
    else if (rollVal === 5) { multiplier = 1.2; textType = 'crit'; }
    else { multiplier = 1.5; textType = 'perfect'; }

    this.currentAction = {
        ...this.currentAction,
        multiplier, rollVal, textType,
        isHeal: skill.type === 'heal' || skill.type === 'buff' || skill.name.includes('恢复') || skill.name.includes('光环')
    };

    // 通知 React 启动转骰子动画！
    this.diceInfo = { finalRoll: rollVal, desc: result.grade.label }; 
    this.phase = CombatPhase.ROLLING;
    this.notifyUI();
  }

  // React 转完骰子后，回调此处计算真实伤害
  applyDamage() {
      const { skill, target, attacker, multiplier, rollVal, textType, isHeal } = this.currentAction;
      
      if (isHeal) {
          // 治疗量计算
          const healAmount = Math.max(1, Math.floor((attacker.attack || 10) * (skill.power / 100) * multiplier));
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + healAmount);
          
          let extraDesc = textType === 'perfect' ? '(大成功!)' : textType === 'weak' ? '(效果微弱)' : '';
          this.diceInfo = { isHeal: true, damage: healAmount, targetId: attacker.id };
          this.addLog(`骰出 [${rollVal}] -> 恢复了 ${healAmount} 点生命 ${extraDesc}`);
      } else {
          // 伤害计算：基础攻击 * 技能倍率 * 骰子倍率
          let baseDamage = Math.floor((attacker.attack || 10) * (skill.power / 100) * multiplier);
          let extraDesc = '';

          // 完美复刻你的“连击”特效：斩击且点数>=4时双倍伤害
          if ((skill.id === 'slash' || skill.name === '斩击') && rollVal >= 4) {
              baseDamage *= 2; 
              extraDesc = '(触发二连斩!)'; 
              this.currentAction.textType = 'crit';
          }
          
          // 扣除敌方护甲
          let finalDamage = Math.max(1, baseDamage - (target.defense || 0));
          
          target.hp = Math.max(0, target.hp - finalDamage);
          let statusDesc = textType === 'weak' ? '(偏斜)' : textType === 'perfect' ? '(完美一击!)' : '';
          
          this.diceInfo = { isHeal: false, damage: finalDamage, type: this.currentAction.textType, targetId: target.id };
          this.addLog(`骰出 [${rollVal}] -> 对 ${target.name} 造成 ${finalDamage} 伤害 ${statusDesc} ${extraDesc}`);
      }

      // 切到执行动画状态，React 会触发屏幕震动和斩击效果
      this.phase = CombatPhase.EXECUTING; 
      this.notifyUI();
  }

  // 完美复刻你的怪物 AI（70%找弱点，30%随机）+ 接入 Dice.js
  handleAI() {
    const aliveHeroes = this.heroes.filter(h => h.isAlive());
    if (aliveHeroes.length === 0) return;
    
    // 智能寻敌：70% 概率攻击血量比例最低的玩家，30% 概率随机
    let target = aliveHeroes[0];
    if (Math.random() < 0.7) {
        let minHpRatio = target.hp / target.maxHp;
        aliveHeroes.forEach(p => {
            if (p.hp / p.maxHp < minHpRatio) {
                minHpRatio = p.hp / p.maxHp;
                target = p;
            }
        });
    } else {
        target = aliveHeroes[Math.floor(Math.random() * aliveHeroes.length)];
    }

    // AI 决定使用什么技能
    const usedSkill = (this.activeUnit.skillSlots && this.activeUnit.skillSlots[0]) 
        ? this.activeUnit.skillSlots[0].name 
        : '突袭';

    // 怪物同样通过 Dice.js 进行判定
    const result = rollAttack(this.activeUnit, 0.5, 6);
    let rollVal = Math.max(1, Math.min(6, Math.round(result.sampleRoll)));
    const isCrit = rollVal >= 5; // 5和6触发怪物暴击

    // 怪物伤害浮动 (90% ~ 120%)
    const floatMultiplier = 0.9 + Math.random() * 0.3;
    let baseDmg = Math.floor((this.activeUnit.attack || 12) * floatMultiplier);
    
    // 暴击 1.5 倍
    let dmgToApply = isCrit ? Math.floor(baseDmg * 1.5) : baseDmg;
    // 扣减玩家护甲
    let actualDmg = Math.max(1, dmgToApply - (target.defense || 0));

    target.hp = Math.max(0, target.hp - actualDmg);
    
    this.addLog(`${this.activeUnit.name} 使用了 [${usedSkill}]！造成 ${actualDmg} 伤害${isCrit ? ' (暴击!)' : ''}`);
    
    // 直接通知 React 播放玩家挨打的动画
    this.diceInfo = { isHeal: false, damage: actualDmg, type: isCrit ? 'crit' : 'damage', targetId: target.id };
    this.phase = CombatPhase.EXECUTING;
    this.notifyUI();
  }

  // React 播完所有飘字、震动特效后回调这里
  evaluateTurn() {
      this.diceInfo = null;

      if (this.enemies.every(e => !e.isAlive())) {
          this.addLog('所有敌人都被打败了！');
          this.phase = CombatPhase.WIN;
      } else if (this.heroes.every(h => !h.isAlive())) {
          this.addLog('队伍全军覆没...');
          this.phase = CombatPhase.LOSE;
      } else {
          // 没人死光，换下一个人行动
          this.nextTurn(); 
          return;
      }
      this.notifyUI();
  }

  // 战斗结束通知全局状态机
  finishCombat() {
      if (this.ui.onCombatResult) {
          this.ui.onCombatResult(this.phase === CombatPhase.WIN ? 'win' : 'lose');
      }
  }
}