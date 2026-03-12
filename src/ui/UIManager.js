// src/ui/UIManager.js
import { DataLoader } from '../data/DataLoader.js';
import { ChestAnimation } from './ChestAnimation.js';
import { InventoryUI } from './InventoryUI.js';

export class UIManager {
  constructor(elements, callbacks = {}) {
    this.els = {
      charSelectScreen: elements.charSelectScreen,
      heroSlots: elements.heroSlots,
      charConfirmBtn: elements.charConfirmBtn,
      charSelectedInfo: elements.charSelectedInfo,
      difficultyButtons: document.getElementById('difficulty-buttons'),
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
      storyScreen: document.getElementById('story-screen'),
      storyTitle: document.getElementById('story-title'),
      storyText: document.getElementById('story-text'),
      storyNextBtn: document.getElementById('story-next-btn'),
    };
    this.onCombatEnd = callbacks.onCombatEnd ?? (() => { });
    this.inventoryUI = new InventoryUI();
  }

  updatePartyStatus(heroes) {
    this.inventoryUI?.update(heroes);
    if (!this.els.partyStatus) return;
    this.els.partyStatus.style.display = 'flex';
    this.els.partyStatus.innerHTML = '';

    heroes.forEach(hero => {
      const hpPct = Math.max(0, (hero.hp / hero.maxHp) * 100);
      const skills = (hero.skillSlots || []).filter(s => s);
      const skillsHtml = skills.length > 0 
        ? skills.map(s => `<div style="color: #ccc; font-size: 10px; margin-top: 2px;">• ${s.name}: ${s.desc}</div>`).join('')
        : '<div style="color: #666; font-size: 10px;">(No skills equipped)</div>';

      const box = document.createElement('div');
      box.className = 'hero-status-box';
      box.innerHTML = `
        <div style="font-weight:bold; font-size:14px; text-shadow: 1px 1px 2px black;">${hero.name}</div>
        <div class="hp-bar-bg"><div class="hp-bar-fill" style="width: ${hpPct}%; background: ${hpPct < 30 ? 'linear-gradient(90deg, #e74c3c, #c0392b)' : ''}"></div></div>
        <div class="hp-text">HP ${hero.hp} / ${hero.maxHp}</div>
        <div class="stat-detail">
          <div style="margin-bottom: 6px; font-weight: bold; border-bottom: 1px solid rgba(255,165,0,0.3); padding-bottom: 2px;">Attributes</div>
          <div style="margin-bottom: 8px;">STR: ${hero.strength} | TOU: ${hero.toughness} | AGI: ${hero.agility} | INT: ${hero.intellect}</div>
          <div style="margin-bottom: 4px; font-weight: bold; border-bottom: 1px solid rgba(255,165,0,0.3); padding-bottom: 2px;">Current Skills</div>
          ${skillsHtml}
        </div>
      `;
      box.onclick = () => {
        const detail = box.querySelector('.stat-detail');
        detail.style.display = detail.style.display === 'block' ? 'none' : 'block';
      };
      this.els.partyStatus.appendChild(box);
    });
  }

  showCharacterSelect(onConfirm) {
    const { charSelectScreen, heroSlots, charConfirmBtn, charSelectedInfo, difficultyButtons } = this.els;
    charSelectScreen.style.display = 'flex';
    heroSlots.innerHTML = '';
    const selected = [];
    let selectedDifficulty = 'normal'; // 默认难度

    // 设置难度按钮
    if (difficultyButtons) {
      const buttons = difficultyButtons.querySelectorAll('.difficulty-btn');
      buttons.forEach(btn => {
        btn.classList.remove('selected');
        if (btn.textContent === selectedDifficulty) btn.classList.add('selected');
        btn.onclick = () => {
          selectedDifficulty = btn.textContent;
          buttons.forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        };
      });
    }

    DataLoader.getAllHeroes().forEach(hero => {
      const card = document.createElement('div');
      card.className = 'hero-card';
      card.innerHTML = `<div style="font-weight:bold;margin-bottom:5px;">${hero.name}</div><div style="font-size:12px;color:#aaa;margin-bottom:4px;">${hero.desc ?? ''}</div><div>HP ${hero.hp}</div>`;
      card.onclick = () => {
        const idx = selected.indexOf(hero);
        if (idx !== -1) { selected.splice(idx, 1); card.classList.remove('selected'); }
        else if (selected.length < 2) { selected.push(hero); card.classList.add('selected'); }
        charConfirmBtn.disabled = selected.length !== 2;
        charSelectedInfo.innerText = `Selected ${selected.length}/2 Heroes`;
      };
      heroSlots.appendChild(card);
    });
    charConfirmBtn.onclick = () => onConfirm([...selected], selectedDifficulty);
  }

  hideCharacterSelect() { this.els.charSelectScreen.style.display = 'none'; }
  showMapGeneration(_heroes, onReady) { this.els.mapGenScreen.style.display = 'flex'; setTimeout(onReady, 1000); }
  hideMapGeneration() { this.els.mapGenScreen.style.display = 'none'; }
  showMapUI() {
    this.els.hud.style.display = 'flex';
    document.getElementById('top-progress').style.display = 'flex';
    if(this.els.partyStatus) this.els.partyStatus.style.display = 'flex';
  }
  updateMovementUI(points) { this.els.movementEl.textContent = `Action Points: ${points}`; }
  updateProgressBar(turn, maxTurns) {
    const bar = document.getElementById('turn-progress-bar');
    const text = document.getElementById('turn-progress-text');
    if (!bar) return;
    const pct = Math.min(100, Math.round(turn / maxTurns * 100));
    bar.style.width = `${pct}%`;
    if (text) text.textContent = `${turn}/${maxTurns}`;
    bar.classList.toggle('danger', turn >= maxTurns - 3);
  }

  updateBossMode() {
    const title = document.querySelector('#top-progress-header span:first-child');
    const desc = document.querySelector('#top-progress-header span:last-child');
    if (title) title.textContent = '⚔️ Boss Battle';
    if (desc) desc.textContent = '在十回合内击败boss否则结束游戏';
  }

  showGameOver() {
    this.showEvent("💀 Game Over", "You failed to defeat the boss in time!", [{ text: "Restart", onClick: () => location.reload() }]);
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
    this.inventoryUI?.update(combatManager.heroes);
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
  showLootAssign(item, heroes, onPick) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:220; display:flex; align-items:center; justify-content:center; font-family:sans-serif;";
    const card = document.createElement("div");
    card.style.cssText = "width:460px; max-width:92vw; background:rgba(10,10,25,0.95); border:1px solid rgba(255,255,255,0.18); border-radius:14px; padding:14px; color:white;";
    const heroBtns = (heroes ?? []).map((h, i) => {
      return `
      <div style="display:flex;gap:8px;align-items:center;margin-top:10px;">
        <div style="flex:1;opacity:.9;">${h.name ?? `Hero${i + 1}`}</div>
        <button class="loot-put" data-i="${i}" style="padding:8px 10px; border-radius:10px; border:1px solid rgba(255,255,255,0.18); background:rgba(255,255,255,0.06); color:white; cursor:pointer;">Store in Bag</button>
        <button class="loot-equip" data-i="${i}" style="padding:8px 10px; border-radius:10px; border:1px solid rgba(255,255,255,0.18); background:rgba(46,204,113,0.18); color:white; cursor:pointer;">Equip Now</button>
      </div>`;
    }).join("");
    card.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><div style="font-weight:700;">Assign to Hero</div><button id="loot-close" style="background:transparent;border:none;color:#aaa;cursor:pointer;">✕</button></div>
    <div style="padding:10px;border:1px solid rgba(255,255,255,0.10);border-radius:12px;"><div style="font-weight:700;">${item?.name ?? "Item"}</div><div style="opacity:.75;font-size:12px;margin-top:4px;">${item?.desc ?? ""}</div><div style="opacity:.7;font-size:12px;margin-top:6px;">Rarity: ${item?.rarity ?? "common"} | Slot: ${item?.slot ?? 0}</div><div style="opacity:.65;font-size:12px;margin-top:6px;">"Equip Now" will assign the item to its slot (0/1) and refresh stats.</div></div>
    <div style="margin-top:10px;">${heroBtns || `<div style="opacity:.75;">No heroes available</div>`}</div>`;
    overlay.appendChild(card); document.body.appendChild(overlay);
    card.querySelector("#loot-close")?.addEventListener("click", () => overlay.remove());
    card.querySelectorAll(".loot-put").forEach(btn => btn.addEventListener("click", () => { onPick?.({ heroIndex: Number(btn.dataset.i), action: "put" }); overlay.remove(); }));
    card.querySelectorAll(".loot-equip").forEach(btn => btn.addEventListener("click", () => { onPick?.({ heroIndex: Number(btn.dataset.i), action: "equip" }); overlay.remove(); }));
  }

  showStoryScreen(title, text, onNext) {
    this.els.storyTitle.textContent = title;
    this.els.storyText.textContent = text;
    this.els.storyScreen.style.display = 'flex';
    this.els.storyNextBtn.onclick = () => {
      this.els.storyScreen.style.display = 'none';
      onNext?.();
    };
  }

  hideStoryScreen() {
    this.els.storyScreen.style.display = 'none';
  }
  showChestReward(item, onClose) { ChestAnimation.play(item, onClose ?? (() => {})); }
}