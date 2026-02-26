// src/ui/UIManager.js
import { DataLoader } from '../data/DataLoader.js';

export class UIManager {
  constructor(elements, callbacks = {}) {
    // ── DOM 元素 ─────────────────────────────────────────────
    this.els = {
      charSelectScreen: elements.charSelectScreen,
      heroSlots: elements.heroSlots,
      charConfirmBtn: elements.charConfirmBtn,
      charSelectedInfo: elements.charSelectedInfo,
      mapGenScreen: elements.mapGenScreen,
      hud: elements.hud,
      movementEl: elements.movementEl,
      turnCountEl: elements.turnCountEl,
      combatUI: elements.combatUI,
      skillPanel: elements.skillPanel,
    };

    // ── 回调（由 GameController 注入）────────────────────────
    this.onCombatEnd = callbacks.onCombatEnd ?? (() => { });
  }

  // ── 角色选择界面 ─────────────────────────────────────────

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

  hideCharacterSelect() {
    this.els.charSelectScreen.style.display = 'none';
  }

  // ── 地图生成过渡界面 ─────────────────────────────────────

  showMapGeneration(_heroes, onReady) {
    this.els.mapGenScreen.style.display = 'flex';
    setTimeout(onReady, 1000);
  }

  hideMapGeneration() {
    this.els.mapGenScreen.style.display = 'none';
  }

  // ── HUD ──────────────────────────────────────────────────

  showMapUI() { this.els.hud.style.display = 'flex'; }
  updateMovementUI(points) { this.els.movementEl.textContent = `行动力：${points}`; }
  updateTurnCount(turn) { this.els.turnCountEl.textContent = `回合：${turn}`; }

  /**
   * 更新回合进度条
   * @param {number} turn      当前回合
   * @param {number} maxTurns  最大回合数
   */
  updateProgressBar(turn, maxTurns) {
    const bar = document.getElementById('turn-progress-bar');
    const text = document.getElementById('turn-progress-text');
    if (!bar) return;
    const pct = Math.min(100, Math.round(turn / maxTurns * 100));
    bar.style.width = `${pct}%`;
    text.textContent = `${turn}/${maxTurns}`;
    // 最后 3 回合红色脉冲警告
    bar.classList.toggle('danger', turn >= maxTurns - 3);
  }

  // ── 战斗界面 ─────────────────────────────────────────────

  showCombatOverlay() {
    this.els.combatUI.style.display = 'block';
    this.els.hud.style.display = 'none';
  }

  hideCombatOverlay() {
    this.els.combatUI.style.display = 'none';
    this.els.hud.style.display = 'flex';
  }

  /**
   * 渲染技能按钮列表，点击后触发战斗行动。
   * @param {object} hero     当前行动的英雄（需有 .id）
   * @param {function} onAction  回调，参数为被选中的 skill 对象
   */
  showCombatCommands(hero, onAction) {
    const { skillPanel } = this.els;
    skillPanel.innerHTML = '';

    const skills = DataLoader.getHeroSkills(hero.id);
    skills.forEach(skill => {
      const btn = document.createElement('button');
      btn.className = 'skill-btn';
      btn.innerText = skill.name;
      btn.title = skill.desc ?? '';
      btn.onclick = () => onAction(skill);
      skillPanel.appendChild(btn);
    });
  }

  /**
   * 战斗结果回调——通知 GameController 切回探索状态。
   * @param {'win'|'lose'} result
   */
  onCombatResult(result) {
    alert(result === 'win' ? '战斗胜利！' : '不幸阵亡...');
    this.onCombatEnd(result);
  }
}