// src/core/GameController.js
import { GameState, MapConfig, TurnConfig } from './Constants.js';
import { HexMap } from '../world/HexMap.js';
import { TileContentType } from '../world/Tile.js';
import { StateMachine } from './StateMachine.js';
import { CombatManager } from './CombatManager.js';
import { Enemy } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { DataLoader } from '../data/DataLoader.js';
import { rollSpeed } from './Dice.js';
import { Renderer } from '../rendering/Renderer.js';
import { rollRandomItem } from '../data/items.js';

export class GameController {
  constructor(map, player, ui, camera) {
    this.map = map; this.player = player; this.ui = ui; this.camera = camera; this.selectedHeroes = []; this.combatManager = null; this.turnCount = 0; this.trapCooldown = 0; this.bossMode = false; this.currentMaxTurns = TurnConfig.MAX_TURNS; this.difficulty = 'normal';
    this.fsm = new StateMachine(GameState.INITIALIZING); this._setupStates();
  }

  hexToPixel(q, r, size) {
    return {
      x: size * (3 / 2 * q),
      y: size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r),
    };
  }

  _setupStates() {
    this.fsm.addState(GameState.CHARACTER_SELECT, {
      enter: () => this.ui.showCharacterSelect((heroes, difficulty) => { this.selectedHeroes = heroes.map(d => this._createHeroFromData(d)); this.difficulty = difficulty; this.fsm.transition(GameState.STORY); }),
      exit: () => this.ui.hideCharacterSelect(),
    });
    this.fsm.addState(GameState.STORY, {
      enter: () => this.ui.showStory(() => this.fsm.transition(GameState.MAP_GENERATION)),
      exit: () => this.ui.hideStory(),
    });
    this.fsm.addState(GameState.MAP_GENERATION, {
      enter: () => this.ui.showMapGeneration(this.selectedHeroes, () => {
        this.map = new HexMap(MapConfig.RADIUS, MapConfig.TILE_SIZE); this.map.generateEvents();
        this.player.setGridPos(-MapConfig.RADIUS, MapConfig.RADIUS, this.map); this.map.revealAround(-MapConfig.RADIUS, MapConfig.RADIUS, 5);
        this.fsm.transition(GameState.MAP_EXPLORATION);
      }),
      exit: () => this.ui.hideMapGeneration(),
    });
    this.fsm.addState(GameState.MAP_EXPLORATION, { enter: () => { this.turnCount = 0; this.ui.showMapUI(); this._startTurn(); }, });
    this.fsm.addState(GameState.COMBAT, {
      enter: contentData => this._enterCombat(contentData),
      exit: () => {
        const won = this.combatManager?.phase === 'WIN'; this._exitCombat(); this.ui.updatePartyStatus(this.selectedHeroes);
        if (won) {
          const loot = rollRandomItem();
          setTimeout(() => {
            this.ui.showChestReward(loot, () => {
              this.ui.showLootAssign(loot, this.selectedHeroes, ({ heroIndex, action }) => {
                const hero = this.selectedHeroes?.[heroIndex]; if (!hero) return;
                if (action === "put") hero.inventory.push(loot);
                else if (action === "equip") { hero.equip?.(loot, Math.max(0, Math.min(1, loot.slot ?? 0))); hero.refreshDerivedStats?.(); }
                this.ui.updatePartyStatus(this.selectedHeroes);
              });
            });
          }, 300);
        }
      },
    });
    this.fsm.addState(GameState.GAME_OVER, {
      enter: () => this.ui.showGameOver(),
      exit: () => {},
    });
  }

  _enterCombat(contentData) {
    const isBoss = contentData.type === TileContentType.BOSS || contentData.type === 'boss';
    const level = contentData.level ?? 1;
    const enemy = new Enemy(contentData.name || (isBoss ? 'Elite Boss' : 'Monster'), isBoss ? 'boss' : 'dungeon', level, isBoss ? { strength: 20 + level * 6, toughness: 16 + level * 5, agility: 10 + level * 2 } : {}, this.difficulty);
    enemy.id = 'e1_' + Date.now();
    this.combatManager = new CombatManager(this.selectedHeroes, [enemy], this.ui); this.combatManager.init(); this.ui.showCombatOverlay(this.combatManager);
  }

  _exitCombat() { this.combatManager = null; this.ui.hideCombatOverlay(); }
  update(dt) {
    if (this.fsm.currentState === GameState.MAP_EXPLORATION) this.player.update(dt);
    else if (this.fsm.currentState === GameState.COMBAT) { this.selectedHeroes.forEach(h => h.update(dt)); this.combatManager?.enemies.forEach(e => e.update(dt)); }
  }
  render(ctx, camera) {
    if (this.fsm.currentState === GameState.MAP_EXPLORATION) Renderer.renderExploration(ctx, camera, this.map, this.player);
    else if (this.fsm.currentState === GameState.COMBAT) Renderer.renderCombat(ctx, this.selectedHeroes, this.combatManager);
  }

  _startTurn() {
    this.turnCount += 1; this.ui.updateProgressBar(this.turnCount, this.currentMaxTurns);
    const roller = this.selectedHeroes.length > 0 ? this.selectedHeroes.reduce((a, b) => ((a.speed ?? 0) >= (b.speed ?? 0) ? a : b)) : this.player;
    const total = rollSpeed(roller, 0.5, 20).gradeIndex + 1;
    this.player.movementPoints = total; this.ui.updateMovementUI(total); this.ui.updatePartyStatus(this.selectedHeroes);
    if (this.trapCooldown > 0) this.trapCooldown--;
    if (!this.bossMode && this.turnCount === TurnConfig.MAX_TURNS) {
      // 进入boss模式
      this.bossMode = true;
      this.turnCount = 0;
      this.currentMaxTurns = 10;
      this.ui.updateBossMode();
      // 震动屏幕
      document.body.classList.add('shake');
      setTimeout(() => document.body.classList.remove('shake'), 500);

      // 点亮boss区域视野
      this.map.revealAround(20, 0, 10);

      // 生成树林和boss
      for (const tile of this.map.tiles.values()) {
        const dq = tile.q - 20;
        const dr = tile.r - 0;
        const ds = -dq - dr;
        const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
        if (dist <= 4) {
          tile.type = TileType.FOREST;
        }
      }
      const bossTile = this.map.getTile(20, 0);
      if (bossTile) {
        this.map.placeContent(20, 0, makeBoss("Final Boss", 10));
      }
    } else if (this.bossMode && this.turnCount === this.currentMaxTurns) {
      // boss模式超时，游戏结束
      this.fsm.transition(GameState.GAME_OVER);
    }
  }

  onEndTurnBtnClick() { this._startTurn(); }

  movePlayer(q, r) {
    if (this.fsm.currentState !== GameState.MAP_EXPLORATION || (q === this.player.q && r === this.player.r)) return;
    const dq = q - this.player.q, dr = r - this.player.r;
    if (!(dq === 0 || dr === 0 || (dq + dr) === 0)) return;
    const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)), tile = this.map.getTile(q, r);
    if (!tile) return;
    const moveCost = (tile.type.moveCost ?? 1) * dist;
    if (this.player.movementPoints < moveCost) return;
    this.player.setGridPos(q, r, this.map); this.player.movementPoints -= moveCost; this.ui.updateMovementUI(this.player.movementPoints);
    this.map.revealAround(q, r, 2); this._handleTileContent(tile); this.ui.updatePartyStatus(this.selectedHeroes);
  }

  _handleTileContent(tile) {
    if (!tile.content) { if (this.trapCooldown === 0 && Math.random() <= 0.15) { this.trapCooldown = 2; this._handleTrapEvent(); } return; }
    const c = tile.content;
    if (c.type === TileContentType.DUNGEON || c.type === TileContentType.BOSS) {
        this.ui.showEvent(c.type === TileContentType.BOSS ? "⚠️ Boss" : "⚔️ Enemy", `Found ${c.name}, engage?`, [{ text: "⚔️ Fight", onClick: () => { tile.content = null; this.fsm.transition(GameState.COMBAT, c); } }, { text: "🏃 Retreat", onClick: () => { this.player.movementPoints = 0; this.ui.updateMovementUI(0); } }]);
    } else if (c.type === TileContentType.TREASURE) {
      this.ui.showEvent("🎁 Treasure",`Found ${c.name}, open it?`, [{ text: "🎁 Open", onClick: () => { tile.content = null; let loot = rollRandomItem(); if (c.lootTier === 3) while(loot.rarity !== 'epic') loot = rollRandomItem(); else if (c.lootTier === 2) while(loot.rarity === 'common') loot = rollRandomItem(); this.ui.showChestReward(loot, () => { this.ui.showLootAssign(loot, this.selectedHeroes, ({ heroIndex, action }) => { const hero = this.selectedHeroes?.[heroIndex]; if (hero) { if (action === "put") hero.inventory.push(loot); else hero.equip?.(loot, loot.slot ?? 0); this.ui.updatePartyStatus(this.selectedHeroes); } }); }); } }]);
    } else if (c.type === TileContentType.ALTAR) {
      this.ui.showEvent("🔮 Altar", "Pray?", [{ text: "🙏 Pray", onClick: () => { tile.content = null; this._handleAltarPray(); } }, { text: "🚶 Leave", onClick: () => {} }]);
    } else if (c.type === TileContentType.LIGHTHOUSE) {
      this.ui.showEvent("🗼 Lighthouse", "Look into the distance", [{ text: "NE", onClick: () => { tile.content = null; this._revealDirection(1, -1); } }, { text: "SE", onClick: () => { tile.content = null; this._revealDirection(1, 1); } }, { text: "SW", onClick: () => { tile.content = null; this._revealDirection(-1, 1); } }, { text: "NW", onClick: () => { tile.content = null; this._revealDirection(-1, -1); } }]);
    }
  }

  _handleTrapEvent() {
    this.ui.showEvent("🪤 Trap", "You triggered a trap! Ready to roll...", [{ text: "🎲 Roll", onClick: () => {
          const val = Math.max(1, Math.min(6, Math.round(rollSpeed(this.selectedHeroes[0], 0.5, 20).sampleRoll / 20 * 6)));
          this.ui.showEvent("🎲 Roll Result", `You rolled a ${val}!`, [{ text: "Continue", onClick: () => {
                  if (val <= 3) { const hero = this.selectedHeroes[0], dmg = Math.floor(hero.maxHp * 0.15); hero.hp = Math.max(0, hero.hp - dmg); this.ui.updatePartyStatus(this.selectedHeroes); this.ui.showEvent("💥 Trap Sprung", `Took ${dmg} damage!`, [{ text: "OK" }]); }
                  else this.ui.showEvent("✨ Evaded", "You dodged the trap!", [{ text: "OK" }]);
                } }]);
        } }]);
  }

  _handleAltarPray() {
    const hero = this.selectedHeroes[0], heal = Math.floor(hero.maxHp * 0.4); hero.hp = Math.min(hero.maxHp, hero.hp + heal);
    this.ui.updatePartyStatus(this.selectedHeroes); this.ui.showEvent("✨ Divine Light", `Healed ${heal} HP`, [{ text: "Continue", onClick: () => {} }]);
  }

  _revealDirection(dirQ, dirR) {
    const radius = 6; for (let dq = -radius; dq <= radius; dq++) { for (let dr = -radius; dr <= radius; dr++) { if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) > radius) continue; const tile = this.map.getTile(this.player.q + dq, this.player.r + dr); if (tile && ((dirQ === 1 && dirR === -1 && dq > 0 && dr < 0) || (dirQ === 1 && dirR === 1 && dq > 0 && dr > 0) || (dirQ === -1 && dirR === 1 && dq < 0 && dr > 0) || (dirQ === -1 && dirR === -1 && dq < 0 && dr < 0))) tile.isRevealed = true; } }
  }

  _createHeroFromData(data) {
    const hero = new Player(data.name); hero.id = data.id; hero.maxHp = data.maxHp ?? data.hp; hero.hp = data.hp; hero.type = 'player';
    if (data.stats) { const s = data.stats; hero.strength = s.strength ?? hero.strength; hero.toughness = s.toughness ?? hero.toughness; hero.agility = s.agility ?? hero.agility; hero.intellect = s.intellect ?? hero.intellect; }
    if (data.skillSlots) data.skillSlots.forEach((sid, i) => { if (sid) { const skill = DataLoader.getSkill(sid); if (skill) hero.equipSkill(skill, i); } });
    hero.refreshDerivedStats(); return hero;
  }
}