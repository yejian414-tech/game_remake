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
  constructor(map, player, ui) {
    this.map = map;
    this.player = player;
    this.ui = ui;
    this.selectedHeroes = [];
    this.combatManager = null;
    this.turnCount = 0;
    this.trapCooldown = 0;
    this.fsm = new StateMachine(GameState.INITIALIZING);
    this._setupStates();
  }

  _setupStates() {
    this.fsm.addState(GameState.CHARACTER_SELECT, {
      enter: () => this.ui.showCharacterSelect(heroes => {
        this.selectedHeroes = heroes.map(d => this._createHeroFromData(d));
        this.fsm.transition(GameState.MAP_GENERATION);
      }),
      exit: () => this.ui.hideCharacterSelect(),
    });
    this.fsm.addState(GameState.MAP_GENERATION, {
      enter: () => this.ui.showMapGeneration(this.selectedHeroes, () => {
        this.map = new HexMap(MapConfig.RADIUS, MapConfig.TILE_SIZE);
        this.map.generateEvents();
        this.player.setGridPos(-MapConfig.RADIUS, MapConfig.RADIUS, this.map);
        this.map.revealAround(-MapConfig.RADIUS, MapConfig.RADIUS, 5);
        this.fsm.transition(GameState.MAP_EXPLORATION);
      }),
      exit: () => this.ui.hideMapGeneration(),
    });
    this.fsm.addState(GameState.MAP_EXPLORATION, {
      enter: () => {
        this.turnCount = 0;
        this.ui.showMapUI();
        this._startTurn();
      },
    });
    this.fsm.addState(GameState.COMBAT, {
      enter: contentData => this._enterCombat(contentData),
      exit: () => {
        const won = this.combatManager?.phase === 'WIN';
        this._exitCombat();
        this.ui.updatePartyStatus(this.selectedHeroes);
        if (won) {
          const loot = rollRandomItem();
          // 延迟一帧确保战斗 UI 已关闭
          setTimeout(() => {
            this.ui.showChestReward(loot, () => {
              if (this.selectedHeroes.length > 0) {
                this.selectedHeroes[0].inventory.push(loot);
              }
            });
          }, 300);
        }
      },
    });
  }

  _enterCombat(contentData) {
    const isBoss = contentData.type === TileContentType.BOSS || contentData.type === 'boss';
    const level = contentData.level ?? 1;
    const statOverrides = isBoss ? { strength: 20 + level * 6, toughness: 16 + level * 5, agility: 10 + level * 2 } : {};
    const enemy = new Enemy(contentData.name || (isBoss ? '精英首领' : '怪兽'), isBoss ? 'boss' : 'dungeon', level, statOverrides);
    enemy.id = 'e1_' + Date.now();
    this.combatManager = new CombatManager(this.selectedHeroes, [enemy], this.ui);
    this.combatManager.init();
    this.ui.showCombatOverlay(this.combatManager);
  }

  _exitCombat() { this.combatManager = null; this.ui.hideCombatOverlay(); }

  update(dt) {
    if (this.fsm.currentState === GameState.MAP_EXPLORATION) this.player.update(dt);
    else if (this.fsm.currentState === GameState.COMBAT) {
      this.selectedHeroes.forEach(h => h.update(dt));
      this.combatManager?.enemies.forEach(e => e.update(dt));
    }
  }

  render(ctx, camera) {
    if (this.fsm.currentState === GameState.MAP_EXPLORATION) Renderer.renderExploration(ctx, camera, this.map, this.player);
    else if (this.fsm.currentState === GameState.COMBAT) Renderer.renderCombat(ctx, this.selectedHeroes, this.combatManager);
  }

  _startTurn() {
    this.turnCount += 1;
    this.ui.updateProgressBar(this.turnCount, TurnConfig.MAX_TURNS);
    const roller = this.selectedHeroes.length > 0 ? this.selectedHeroes.reduce((a, b) => ((a.speed ?? 0) >= (b.speed ?? 0) ? a : b)) : this.player;
    const result = rollSpeed(roller, 0.5, 20);
    const total = result.gradeIndex + 1;
    this.player.movementPoints = total;
    this.ui.updateMovementUI(total);
    this.ui.updatePartyStatus(this.selectedHeroes);
    if (this.trapCooldown > 0) this.trapCooldown--;
  }

  onEndTurnBtnClick() { this._startTurn(); }

  // ── 修改：仅保留直线移动逻辑，移除原有的点击自身逻辑 ──
  movePlayer(q, r) {
    if (this.fsm.currentState !== GameState.MAP_EXPLORATION) return;
    const dq = q - this.player.q;
    const dr = r - this.player.r;

    // 如果点击当前位置，不执行任何操作（功能已转移到左上角 UI）
    if (dq === 0 && dr === 0) return;

    // 直线判定
    const isStraight = (dq === 0 || dr === 0 || (dq + dr) === 0);
    if (!isStraight) return;

    const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
    const tile = this.map.getTile(q, r);
    if (!tile) return;

    const moveCost = (tile.type.moveCost ?? 1) * dist;
    if (this.player.movementPoints < moveCost) return;

    this.player.setGridPos(q, r, this.map);
    this.player.movementPoints -= moveCost;
    this.ui.updateMovementUI(this.player.movementPoints);
    this.map.revealAround(q, r, 2);
    this._handleTileContent(tile);
    
    // 移动后更新 UI（确保血量同步）
    this.ui.updatePartyStatus(this.selectedHeroes);
  }

  _handleTileContent(tile) {
    if (!tile.content) {
      if (this.trapCooldown === 0 && Math.random() <= 0.15) {
        this.trapCooldown = 2;
        this._handleTrapEvent();
      }
      return;
    }
    const content = tile.content;
    if (content.type === TileContentType.DUNGEON || content.type === TileContentType.BOSS || content.type === 'enemy') {
        this.ui.showEvent(content.type === TileContentType.BOSS ? "⚠️ Boss" : "⚔️ 敌人", `发现 ${content.name}，迎战？`, [
            { text: "⚔️ 开战", onClick: () => { tile.content = null; this.fsm.transition(GameState.COMBAT, content); } },
            { text: "🏃 撤退", onClick: () => { this.player.movementPoints = 0; this.ui.updateMovementUI(0); } }
        ]);
    }else if (content.type === TileContentType.TREASURE) {
      this.ui.showEvent(
        "🎁 宝箱",`发现 ${content.name}，要打开吗？`,
        [
          { text: "🎁 打开", onClick: () => { tile.content = null; let loot;
              if (content.lootTier === 3) {
                  // 史诗必出史诗
                  loot = rollRandomItem();
                  while (loot.rarity !== 'epic') {
                      loot = rollRandomItem();
                  }
              } else if (content.lootTier === 2) {
                  // 稀有：不出普通
                  loot = rollRandomItem();
                  while (loot.rarity === 'common') {
                      loot = rollRandomItem();
                  }
              } else {
                  // 普通宝箱：正常随机
                  loot = rollRandomItem();
              }
              this.ui.showChestReward(loot, () => {
                  if (this.selectedHeroes.length > 0) {
                      this.selectedHeroes[0].inventory.push(loot);
                  }
              });
            }
          }
        ]
      );
    }else if (content.type === TileContentType.ALTAR) {
      this.ui.showEvent("🔮 祭坛", "祈祷？", [{ text: "🙏 祈祷", onClick: () => { tile.content = null; this._handleAltarPray(); } }, { text: "🚶 离开", onClick: () => {} }]);
    }else if (content.type === TileContentType.LIGHTHOUSE) {
      this.ui.showEvent("🗼 灯塔", "远眺方向", [
          { text: "右上", onClick: () => { tile.content = null; this._revealDirection(1, -1); } },
          { text: "右下", onClick: () => { tile.content = null; this._revealDirection(1, 1); } },
          { text: "左下", onClick: () => { tile.content = null; this._revealDirection(-1, 1); } },
          { text: "左上", onClick: () => { tile.content = null; this._revealDirection(-1, -1); } }
      ]);
    }
  }

  _handleTrapEvent() {
    const hero = this.selectedHeroes[0];
    this.ui.showEvent("🪤 陷阱", "踩到了机关！准备摇骰子...", [
      { text: "🎲 掷骰",  onClick: () => {
          const result = rollSpeed(hero, 0.5, 20);
          const val = Math.max(1, Math.min(6, Math.round(result.sampleRoll / 20 * 6)));
          // 先显示骰子结果
          this.ui.showEvent( "🎲 骰子结果",`你掷出了 ${val}！`,
            [
              { text: "继续", onClick: () => {
                  if (val <= 3) {
                    const dmg = Math.floor(hero.maxHp * 0.15);
                    hero.hp = Math.max(0, hero.hp - dmg);
                    this.ui.updatePartyStatus(this.selectedHeroes);
                    this.ui.showEvent(
                      "💥 触发陷阱",`受到 ${dmg} 点伤害！`,
                      [{ text: "确定" }]
                    );
                  } else {
                    this.ui.showEvent(
                      "✨ 成功闪避","你躲开了陷阱！",
                      [{ text: "确定" }]
                    );
                  }
                }
              }
            ]
          );
        }
      }
    ]);
  }

  _handleAltarPray() {
    const hero = this.selectedHeroes[0];
    const heal = Math.floor(hero.maxHp * 0.4);
    hero.hp = Math.min(hero.maxHp, hero.hp + heal);
    this.ui.updatePartyStatus(this.selectedHeroes);
    this.ui.showEvent("✨ 圣光", `恢复了 ${heal} HP`, [{ text: "继续", onClick: () => {} }]);
  }

  _revealDirection(dirQ, dirR) {
    const originQ = this.player.q; const originR = this.player.r; const radius = 6;
    for (let dq = -radius; dq <= radius; dq++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) > radius) continue;
        const tile = this.map.getTile(originQ + dq, originR + dr);
        if (tile && ((dirQ === 1 && dirR === -1 && dq > 0 && dr < 0) || (dirQ === 1 && dirR === 1 && dq > 0 && dr > 0) || (dirQ === -1 && dirR === 1 && dq < 0 && dr > 0) || (dirQ === -1 && dirR === -1 && dq < 0 && dr < 0))) tile.isRevealed = true;
      }
    }
  }

  _createHeroFromData(data) {
    const hero = new Player(data.name); hero.id = data.id; hero.maxHp = data.maxHp ?? data.hp; hero.hp = data.hp; hero.type = 'player';
    if (data.stats) { const s = data.stats; hero.strength = s.strength ?? hero.strength; hero.toughness = s.toughness ?? hero.toughness; hero.agility = s.agility ?? hero.agility; hero.intellect = s.intellect ?? hero.intellect; }
    if (data.skillSlots) data.skillSlots.forEach((sid, i) => { if (sid) { const skill = DataLoader.getSkill(sid); if (skill) hero.equipSkill(skill, i); } });
    hero.refreshDerivedStats(); return hero;
  }
}