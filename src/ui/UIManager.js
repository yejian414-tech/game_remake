// src/ui/UIManager.js
import { DataLoader } from '../data/DataLoader.js';

export class UIManager {
  constructor(elements, callbacks = {}) {
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
      partyStatus: document.getElementById('party-status-overlay'),
      eventUI: document.getElementById('event-ui'),
      eventTitle: document.getElementById('event-title'),
      eventDesc: document.getElementById('event-desc'),
      eventButtons: document.getElementById('event-buttons'),
    };
    this.onCombatEnd = callbacks.onCombatEnd ?? (() => { });
  }

  // ── 修改：更新状态栏并绑定点击事件 ──
  updatePartyStatus(heroes) {
    if (!this.els.partyStatus) return;
    this.els.partyStatus.style.display = 'flex';
    this.els.partyStatus.innerHTML = '';

    heroes.forEach(hero => {
      const hpPct = Math.max(0, (hero.hp / hero.maxHp) * 100);
      
      // 生成技能列表
      const skills = (hero.skillSlots || []).filter(s => s);
      const skillsHtml = skills.length > 0 
        ? skills.map(s => `<div style="color: #ccc; font-size: 10px; margin-top: 2px;">• ${s.name}: ${s.desc}</div>`).join('')
        : '<div style="color: #666; font-size: 10px;">(无装备技能)</div>';

      const box = document.createElement('div');
      box.className = 'hero-status-box';
      box.innerHTML = `
        <div style="font-weight:bold; font-size:14px; text-shadow: 1px 1px 2px black;">${hero.name}</div>
        <div class="hp-bar-bg">
          <div class="hp-bar-fill" style="width: ${hpPct}%; background: ${hpPct < 30 ? 'linear-gradient(90deg, #e74c3c, #c0392b)' : ''}"></div>
        </div>
        <div class="hp-text">HP ${hero.hp} / ${hero.maxHp}</div>
        
        <div class="stat-detail">
          <div style="margin-bottom: 6px; font-weight: bold; border-bottom: 1px solid rgba(255,165,0,0.3); padding-bottom: 2px;">属性数值</div>
          <div style="margin-bottom: 8px;">STR: ${hero.strength} | TOU: ${hero.toughness} | AGI: ${hero.agility} | INT: ${hero.intellect}</div>
          
          <div style="margin-bottom: 4px; font-weight: bold; border-bottom: 1px solid rgba(255,165,0,0.3); padding-bottom: 2px;">当前技能</div>
          ${skillsHtml}
        </div>
      `;

      // 绑定点击事件：仅切换被点击英雄的详情
      box.onclick = () => {
        const detail = box.querySelector('.stat-detail');
        const isShowing = detail.style.display === 'block';
        detail.style.display = isShowing ? 'none' : 'block';
      };

      this.els.partyStatus.appendChild(box);
    });
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
    document.getElementById('top-progress').style.display = 'flex';
    if(this.els.partyStatus) this.els.partyStatus.style.display = 'flex';
  }

  updateMovementUI(points) { this.els.movementEl.textContent = `行动力：${points}`; }

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
    this.els.hud.style.display = 'none';
    document.getElementById('top-progress').style.display = 'none';
    if(this.els.partyStatus) this.els.partyStatus.style.display = 'none';
    this.updateCombatUI(combatManager);
  }

  hideCombatOverlay() {
    if (this.els.combatUI) this.els.combatUI.style.display = 'none';
    this.els.hud.style.display = 'flex';
    document.getElementById('top-progress').style.display = 'flex';
    if(this.els.partyStatus) this.els.partyStatus.style.display = 'flex';
    if (window.unmountCombatUI) window.unmountCombatUI();
  }

  updateCombatUI(combatManager) {
    if (!combatManager || !window.renderCombatUI) return;
    const stateSnapshot = {
      heroes: combatManager.heroes.map(h => ({ ...h, skills: h.skillSlots ? h.skillSlots.filter(s => s) : h.skills })),
      enemies: [...combatManager.enemies],
      phase: combatManager.phase,
      activeUnit: combatManager.activeUnit ? { ...combatManager.activeUnit, skills: combatManager.activeUnit.skillSlots ? combatManager.activeUnit.skillSlots.filter(s => s) : combatManager.activeUnit.skills } : null,
      turnOrder: [combatManager.activeUnit, ...combatManager.turnOrder].filter(Boolean),
      logs: [...combatManager.logs],
      diceInfo: combatManager.diceInfo
    };
    const callbacks = {
      onStartBattle: () => { if(combatManager.startGame) combatManager.startGame(); else combatManager.phase = 'PLAYER_TURN'; this.updateCombatUI(combatManager); },
      onSkillSelect: (skill) => combatManager.selectSkill(skill),
      onTargetSelect: (targetId) => combatManager.executePlayerAction(targetId),
      onRollComplete: () => combatManager.applyDamage(),
      onExecuteComplete: () => combatManager.evaluateTurn(),
      onFinishCombat: () => this.onCombatResult(combatManager.phase === 'WIN' ? 'win' : 'lose')
    };
    window.renderCombatUI('react-combat-root', stateSnapshot, callbacks);
  }

  onCombatResult(result) { this.hideCombatOverlay(); this.onCombatEnd(result); }

  showEvent(title, desc, buttons = []) {
    const { eventUI, eventTitle, eventDesc, eventButtons } = this.els;
    if (!eventUI) return;
    eventUI.style.display = 'flex';
    eventTitle.innerText = title;
    eventDesc.innerText = desc;
    eventButtons.innerHTML = '';
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.innerText = btn.text;
      button.style.cssText = "background: #e67e22; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;";
      button.onclick = () => { eventUI.style.display = 'none'; if (btn.onClick) btn.onClick(); };
      eventButtons.appendChild(button);
    });
  }
}