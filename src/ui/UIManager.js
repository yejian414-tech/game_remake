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

      // ⚠️ 战斗系统的核心挂载点
      combatUI: elements.combatUI,
      reactCombatRoot: elements.reactCombatRoot || document.getElementById('react-combat-root'),

      // 事件弹窗节点 (用于陷阱/祭坛等)
      eventUI: document.getElementById('event-ui'),
      eventTitle: document.getElementById('event-title'),
      eventDesc: document.getElementById('event-desc'),
      eventButtons: document.getElementById('event-buttons'),
    };

    this.onCombatEnd = callbacks.onCombatEnd ?? (() => { });
  }

  // ── 角色选择与地图生成 ─────────────────────────────────────────
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

  // ── HUD 与 进度条 ──────────────────────────────────────────────
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

  // ── 3. 战斗界面缝合 (完美对接 React) ───────────────────────────

  showCombatOverlay(combatManager) {
    // 开启战斗界面容器
    if (this.els.combatUI) this.els.combatUI.style.display = 'block';
    if (this.els.reactCombatRoot) this.els.reactCombatRoot.style.display = 'block';

    // 隐藏基础 HUD
    this.els.hud.style.display = 'none';
    const top = document.getElementById('top-progress');
    if (top) top.style.display = 'none';

    this.updateCombatUI(combatManager);
  }

  hideCombatOverlay() {
    if (this.els.combatUI) this.els.combatUI.style.display = 'none';
    if (this.els.reactCombatRoot) this.els.reactCombatRoot.style.display = 'none';

    this.els.hud.style.display = 'flex';

    // 恢复顶部进度条
    const top = document.getElementById('top-progress');
    if (top) top.style.display = 'flex';

    // ⚠️ 极其关键：卸载 React，释放内存，防止下次进战斗状态残留
    if (window.unmountCombatUI) {
      window.unmountCombatUI(this.els.reactCombatRoot);
    }
  }

  /** 将 CombatManager 的数据深度打包，推送到 React */
  updateCombatUI(combatManager) {
    if (!combatManager || !window.renderCombatUI) return;

    // ⚠️ 深度构造快照：过滤掉为 null 的空技能槽，防止 React 渲染报错
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

    // 回调映射
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

    // 执行 React 渲染 (注意兼容参数传递)
    window.renderCombatUI(this.els.reactCombatRoot || 'react-combat-root', stateSnapshot, callbacks);
  }

  onCombatResult(result) {
    this.onCombatEnd(result);
  }
  // ── 4. 事件弹窗 ─────────────────────────────
  showEvent(title, desc, buttons = []) {
    const { eventUI, eventTitle, eventDesc, eventButtons } = this.els;
    eventUI.style.display = 'flex';
    eventTitle.innerText = title;
    eventDesc.innerText = desc;
    eventButtons.innerHTML = '';

    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.innerText = btn.text;
      button.onclick = () => {
        eventUI.style.display = 'none';
        if (btn.onClick) btn.onClick();
      };
      eventButtons.appendChild(button);
    });
  }

  hideEvent() { this.els.eventUI.style.display = 'none'; }
}