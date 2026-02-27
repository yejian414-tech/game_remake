// src/ui/UIManager.js
import { DataLoader } from '../data/DataLoader.js';

export class UIManager {
  constructor(elements, callbacks = {}) {
    this.els = elements;
    this.onCombatEnd = callbacks.onCombatEnd ?? (() => { });
  }

  showCharacterSelect(onConfirm) {
    this.els.charSelectScreen.style.display = 'flex';
    this.els.heroSlots.innerHTML = '';
    const selected = [];

    DataLoader.getAllHeroes().forEach(hero => {
      const card = document.createElement('div');
      card.className = 'hero-card';
      card.innerHTML = `
        <div style="font-weight:bold;margin-bottom:5px;">${hero.name}</div>
        <div style="font-size:12px;color:#aaa;margin-bottom:4px;">${hero.desc ?? ''}</div>
        <div>HP ${hero.hp}</div>
      `;
      card.onclick = () => {
        const idx = selected.indexOf(hero);
        if (idx !== -1) {
          selected.splice(idx, 1);
          card.classList.remove('selected');
        } else if (selected.length < 2) {
          selected.push(hero);
          card.classList.add('selected');
        }
        this.els.charConfirmBtn.disabled = selected.length !== 2;
        this.els.charSelectedInfo.innerText = `已选 ${selected.length}/2 名英雄`;
      };
      this.els.heroSlots.appendChild(card);
    });

    this.els.charConfirmBtn.onclick = () => onConfirm([...selected]);
  }

  hideCharacterSelect() { this.els.charSelectScreen.style.display = 'none'; }
  
  showMapGeneration(_heroes, onReady) { this.els.mapGenScreen.style.display = 'flex'; setTimeout(onReady, 1000); }
  hideMapGeneration() { this.els.mapGenScreen.style.display = 'none'; }
  
  showMapUI() {
    this.els.hud.style.display = 'flex';
    const top = document.getElementById('top-progress');
    if (top) top.style.display = 'flex';
  }
  
  updateMovementUI(points) { this.els.movementEl.textContent = `行动力：${points}`; }
  updateTurnCount(_turn) {}

  updateProgressBar(turn, maxTurns) {
    const bar = document.getElementById('turn-progress-bar');
    const text = document.getElementById('turn-progress-text');
    if (!bar) return;
    const pct = Math.min(100, Math.round(turn / maxTurns * 100));
    bar.style.width = `${pct}%`;
    if (text) text.textContent = `${turn}/${maxTurns}`;
    bar.classList.toggle('danger', turn >= maxTurns - 3);
  }

  // ⚠️ 呼叫 React 战斗界面
showCombatOverlay(combatManager) {
    this.els.combatUI.style.display = 'block';
    this.els.hud.style.display = 'none';

    // 每一帧或状态改变时，将数据同步给 React
    this.updateCombatUI(combatManager);
  }

  updateCombatUI(combatManager) {
    if (!combatManager || !window.renderCombatUI) return;

    // 构建发给 React 的快照，包含你原版代码需要的核心状态
    const stateSnapshot = {
      heroes: combatManager.heroes,
      enemies: combatManager.enemies,
      phase: combatManager.phase,
      logs: combatManager.logs,
      diceInfo: combatManager.diceInfo,
      activeUnit: combatManager.activeUnit,
      turnOrder: combatManager.turnOrder
    };

    const callbacks = {
      onStartBattle: () => { combatManager.phase = 'PLAYER_TURN'; this.updateCombatUI(combatManager); },
      onSkillSelect: (skill) => combatManager.handleSkillSelect(skill),
      onTargetSelect: (targetId) => combatManager.handleTargetSelect(targetId),
      onRollComplete: () => combatManager.executeAction(),
      onExecuteComplete: () => combatManager.finishAction(),
      onFinishCombat: () => this.onCombatResult(combatManager.phase === 'WIN' ? 'win' : 'lose')
    };

    // 调用 CombatUI.js 暴露的接口
    window.renderCombatUI('react-combat-root', stateSnapshot, callbacks);
  }

  onCombatResult(result) {
    // 卸载 React 组件防止内存泄漏
    if (window.unmountCombatUI) window.unmountCombatUI();
    this.els.combatUI.style.display = 'none';
    this.els.hud.style.display = 'flex';
    this.onCombatEnd(result);
  }
}