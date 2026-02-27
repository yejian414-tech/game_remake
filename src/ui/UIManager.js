// src/ui/UIManager.js
import { DataLoader } from '../data/DataLoader.js';

export class UIManager {
  constructor(elements, callbacks = {}) {
    // ── 1. 结构化 DOM 元素 ──────────────────────────────────────────
    this.els = {
      charSelectScreen: elements.charSelectScreen,
      heroSlots: elements.heroSlots,
      charConfirmBtn: elements.charConfirmBtn,
      charSelectedInfo: elements.charSelectedInfo,
      mapGenScreen: elements.mapGenScreen,
      hud: elements.hud,
      movementEl: elements.movementEl,

      combatUI: elements.combatUI,
      reactCombatRoot: elements.reactCombatRoot || document.getElementById('react-combat-root'),

      eventUI: document.getElementById('event-ui'),
      eventTitle: document.getElementById('event-title'),
      eventDesc: document.getElementById('event-desc'),
      eventButtons: document.getElementById('event-buttons'),
    };

    this.onCombatEnd = callbacks.onCombatEnd ?? (() => { });
  }

  showCharacterSelect(onConfirm) {
    const { charSelectScreen, heroSlots, charConfirmBtn, charSelectedInfo } = this.els;
    charSelectScreen.style.display = 'flex';
    heroSlots.innerHTML = '';
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
        charConfirmBtn.disabled = selected.length !== 2;
        charSelectedInfo.innerText = `已选 ${selected.length}/2 名英雄`;
      };
      heroSlots.appendChild(card);
    });
    charConfirmBtn.onclick = () => onConfirm([...selected]);
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

  showCombatOverlay(combatManager) {
    if (this.els.combatUI) this.els.combatUI.style.display = 'block';
    if (this.els.reactCombatRoot) this.els.reactCombatRoot.style.display = 'block';

    this.els.hud.style.display = 'none';
    const top = document.getElementById('top-progress');
    if (top) top.style.display = 'none';

    this.updateCombatUI(combatManager);
  }

  hideCombatOverlay() {
    if (this.els.combatUI) this.els.combatUI.style.display = 'none';
    if (this.els.reactCombatRoot) this.els.reactCombatRoot.style.display = 'none';

    this.els.hud.style.display = 'flex';

    const top = document.getElementById('top-progress');
    if (top) top.style.display = 'flex';

    if (window.unmountCombatUI) {
      window.unmountCombatUI(this.els.reactCombatRoot);
    }
  }

  updateCombatUI(combatManager) {
    if (!combatManager || !window.renderCombatUI) return;

    const stateSnapshot = {
      heroes: combatManager.heroes.map(h => ({
          ...h,
          skills: h.skillSlots ? h.skillSlots.filter(s => s) : h.skills
      })),
      enemies: [...combatManager.enemies],
      phase: combatManager.phase,
      activeUnit: combatManager.activeUnit ? {
          ...combatManager.activeUnit,
          skills: combatManager.activeUnit.skillSlots ? combatManager.activeUnit.skillSlots.filter(s => s) : combatManager.activeUnit.skills
      } : null,
      turnOrder: [combatManager.activeUnit, ...combatManager.turnOrder].filter(Boolean),
      logs: [...combatManager.logs],
      diceInfo: combatManager.diceInfo
    };

    const callbacks = {
      onStartBattle: () => {
        if(combatManager.startGame) combatManager.startGame();
        else combatManager.phase = 'PLAYER_TURN';
        this.updateCombatUI(combatManager);
      },
      onSkillSelect: (skill) => combatManager.selectSkill(skill),
      onTargetSelect: (targetId) => combatManager.executePlayerAction(targetId),
      onRollComplete: () => combatManager.applyDamage(),
      onExecuteComplete: () => combatManager.evaluateTurn(),
      onFinishCombat: () => this.onCombatResult(combatManager.phase === 'WIN' ? 'win' : 'lose')
    };

    // ⚠️ 关键修复：直接传递字符串 ID 给 React
    window.renderCombatUI('react-combat-root', stateSnapshot, callbacks);
  }

  onCombatResult(result) {
    this.onCombatEnd(result);
  }

  showEvent(title, desc, buttons = []) {
    const { eventUI, eventTitle, eventDesc, eventButtons } = this.els;

    if (!eventUI) {
      console.warn("未找到 eventUI DOM 节点，无法显示事件弹窗。");
      return;
    }

    eventUI.style.display = 'flex';
    eventTitle.innerText = title;
    eventDesc.innerText = desc;
    eventButtons.innerHTML = '';

    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.innerText = btn.text;
      button.style.cssText = "background: #e67e22; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;";

      button.onclick = () => {
        eventUI.style.display = 'none';
        if (btn.onClick) btn.onClick();
      };
      eventButtons.appendChild(button);
    });
  }

  hideEvent() {
    if(this.els.eventUI) this.els.eventUI.style.display = 'none';
  }
  onCombatResult(result) {
      // 1. 关闭战斗画面，恢复地图 HUD
      this.hideCombatOverlay();

      // 2. 把结果（'win' 或 'lose'）告诉 main.js
      this.onCombatEnd(result);
    }
}