// src/core/GameController.js
import { GameState, MapConfig, TurnConfig, MapPresets } from './Constants.js';
import { HexMap, createMapByPreset } from '../world/HexMap.js';
import { TileContentType, makePortal, makeBoss, TileType, makeNPC, makeVillage, makeMerchant, makeRuin, makeCorruptedDeer } from '../world/Tile.js';
import { NPC_LIST, VILLAGE_LIST, MERCHANT_LIST, RUIN_LIST, CORRUPTED_DEER_LIST } from '../data/EventTable.js';
import { StateMachine } from './StateMachine.js';
import { CombatManager } from './CombatManager.js';
import { Enemy } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { DataLoader } from '../data/DataLoader.js';
import { rollSpeed } from './Dice.js';
import { Renderer } from '../rendering/Renderer.js';
import { rollRandomItem } from '../data/items.js';
import { GameStory } from './GameStory.js';
import { EventTable } from '../data/EventTable.js';

export class GameController {
  constructor(map, player, ui, camera) {
    this.map = map;
    this.noviceVillage = null;
    this.currentMapName = '新手村';
    this.player = player;
    this.ui = ui;
    this.camera = camera;
    this.selectedHeroes = [];
    this.combatManager = null;
    this.turnCount = 0;
    this.trapCooldown = 0;
    this.bossMode = false;
    this.bossModePenaltyActive = false;
    this.bossModePenaltyWarned = false;
    this.currentMaxTurns = TurnConfig.MAX_TURNS;
    this.currentMissionName = null;
    this.merchantEncountered = false;
    this.gameStory = new GameStory(ui);
    this.fsm = new StateMachine(GameState.INITIALIZING);
    this._setupStates();
  }

  hexToPixel(q, r, size) {
    return {
      x: size * (3 / 2 * q),
      y: size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r),
    };
  }

  _setupStates() {
    this.fsm.addState(GameState.CHARACTER_SELECT, {
      enter: () => this.ui.showCharacterSelect(heroes => { this.selectedHeroes = heroes.map(d => this._createHeroFromData(d)); this.fsm.transition(GameState.STORY); }),
      exit: () => this.ui.hideCharacterSelect(),
    });
    this.fsm.addState(GameState.STORY, {
      enter: () => this.gameStory.showStory('INTRO', () => this.fsm.transition(GameState.MAP_GENERATION)),
      exit: () => this.gameStory.hideStory(),
    });
    this.fsm.addState(GameState.MAP_GENERATION, {
      enter: () => this.ui.showMapGeneration(this.selectedHeroes, () => {
        // 主地图
        this.map = createMapByPreset('main');
        this.noviceVillage = createMapByPreset('novice');
        // 统一从MapPresets获取出生地坐标
        const mainQ = -MapPresets.main.radius + 1;
        const mainR = MapPresets.main.radius - 1;
        const noviceQ = -MapPresets.novice.radius + 1;
        const noviceR = MapPresets.novice.radius - 1;
        // 主地图出生地放传送阵
        this.map.placeContent(mainQ, mainR, makePortal('新手村', noviceQ, noviceR), 0);
        // 新手村出生地放传送阵
        this.noviceVillage.placeContent(noviceQ, noviceR, makePortal('主地图', mainQ, mainR), 0);

        // 迷失森林(-8,7)放置受伤的村民NPC
        // 批量放置所有NPC
        for (const npc of NPC_LIST) {
          const targetMap = npc.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(npc.q, npc.r);
          // 只在草地上放置事件
          if (tile && tile.type === TileType.GRASS) {
            targetMap.placeContent(
              npc.q, npc.r,
              makeNPC(npc.name, npc.dialogue, npc.options || {}),
              0
            );
          }
        }
        // 批量放置所有村庄
        for (const village of VILLAGE_LIST) {
          const targetMap = village.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(village.q, village.r);
          // 只在草地上放置事件
          if (tile && tile.type === TileType.GRASS) {
            targetMap.placeContent(
              village.q, village.r,
              makeVillage(village.name),
              0
            );
          }
        }
        // 批量放置所有商人
        for (const merchant of MERCHANT_LIST) {
          const targetMap = merchant.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(merchant.q, merchant.r);
          // 只在草地上放置事件
          if (tile && tile.type === TileType.GRASS) {
            targetMap.placeContent(
              merchant.q, merchant.r,
              makeMerchant(merchant.name),
              0
            );
          }
        }
        // 批量放置所有遗迹
        for (const ruin of RUIN_LIST) {
          const targetMap = ruin.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(ruin.q, ruin.r);
          // 只在草地上放置事件
          if (tile && tile.type === TileType.GRASS) {
            targetMap.placeContent(
              ruin.q, ruin.r,
              makeRuin(ruin.name, ruin.enemyName),
              0
            );
          }
        }
        // 批量放置所有被腐化的鹿
        for (const deer of CORRUPTED_DEER_LIST) {
          const targetMap = deer.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(deer.q, deer.r);
          // 只在草地上放置事件
          if (tile && tile.type === TileType.GRASS) {
            targetMap.placeContent(
              deer.q, deer.r,
              makeCorruptedDeer(deer.name),
              0
            );
          }
        }
        // 玩家出生地在新手村
        this.currentMapName = '新手村';
        this.player.setGridPos(noviceQ, noviceR, this.noviceVillage);
        this.noviceVillage.revealAround(noviceQ, noviceR, 5);
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
    const enemy = new Enemy(contentData.name || (isBoss ? 'Elite Boss' : 'Monster'), isBoss ? 'boss' : 'dungeon', level, isBoss ? { strength: 20 + level * 6, toughness: 16 + level * 5, agility: 10 + level * 2 } : {});
    enemy.id = 'e1_' + Date.now();
    this.combatManager = new CombatManager(this.selectedHeroes, [enemy], this.ui); this.combatManager.init(); this.ui.showCombatOverlay(this.combatManager);
  }

  _exitCombat() { this.combatManager = null; this.ui.hideCombatOverlay(); }
  update(dt) {
    if (this.fsm.currentState === GameState.MAP_EXPLORATION) this.player.update(dt);
    else if (this.fsm.currentState === GameState.COMBAT) { this.selectedHeroes.forEach(h => h.update(dt)); this.combatManager?.enemies.forEach(e => e.update(dt)); }
  }
  render(ctx, camera) {
    if (this.fsm.currentState === GameState.MAP_EXPLORATION) {
      // 根据当前地图名渲染正确的地图
      const currentMap = this.currentMapName === '新手村' ? this.noviceVillage : this.map;
      Renderer.renderExploration(ctx, camera, currentMap, this.player);
    } else if (this.fsm.currentState === GameState.COMBAT) {
      Renderer.renderCombat(ctx, this.selectedHeroes, this.combatManager);
    }
  }

  _startTurn() {
    this.turnCount += 1; 
    this.ui.updateProgressBar(this.turnCount, this.currentMaxTurns);
    const roller = this.selectedHeroes.length > 0 ? this.selectedHeroes.reduce((a, b) => ((a.speed ?? 0) >= (b.speed ?? 0) ? a : b)) : this.player;
    const total = rollSpeed(roller, 0.5, 20).gradeIndex + 1;
    this.player.movementPoints = total; 
    this.ui.updateMovementUI(total); 
    this.ui.updatePartyStatus(this.selectedHeroes);
    if (this.trapCooldown > 0) this.trapCooldown--;
    
    // Boss惩罚阶段：每回合扣除英雄最大血量的5%
    if (this.bossModePenaltyActive) {
      const damage = Math.max(1, Math.floor(this.selectedHeroes[0]?.maxHp || 100) * 0.05);
      for (const hero of this.selectedHeroes) {
        hero.hp = Math.max(0, hero.hp - damage);
      }
      // 只在第一次显示提示
      if (!this.bossModePenaltyWarned) {
        this.bossModePenaltyWarned = true;
        this.ui.showEvent(
          '⚠️ 威胁',
          `每一刻的耽搁都在削弱你的生命力！\n每名英雄扣除 -${damage} HP (最大生命值的5%)`,
          [{ text: '继续', onClick: () => {} }]
        );
      }
      this.ui.updatePartyStatus(this.selectedHeroes);
    }
    
    if (!this.bossMode && this.turnCount === this.currentMaxTurns) {
      // 进入boss模式
      this.bossMode = true;
      this.bossModePenaltyActive = true;
      this.turnCount = 0;
      this.currentMaxTurns = 10;
      this.ui.updateBossMode();
      this.ui.setProgressBarCritical();
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
    // 当前地图
    const curMap = this.currentMapName === '新手村' ? this.noviceVillage : this.map;
    const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)), tile = curMap.getTile(q, r);
    if (!tile) return;
    // 检查是否可通行（moveCost 为 Infinity 表示不可通行）
    if (!isFinite(tile.type.moveCost)) return;
    const moveCost = tile.type.moveCost * dist;
    if (this.player.movementPoints < moveCost) return;
    this.player.setGridPos(q, r, curMap); this.player.movementPoints -= moveCost; this.ui.updateMovementUI(this.player.movementPoints);
    curMap.revealAround(q, r, 2); this._handleTileContent(tile); this.ui.updatePartyStatus(this.selectedHeroes);
  }

  _handleTileContent(tile) {
    if (!tile.content) {
      // 随机陷阱事件
      if (this.trapCooldown === 0 && Math.random() <= EventTable.getTrapSpawnChance()) {
        this.trapCooldown = 2;
        EventTable.handleTrap(this);
      }
      return;
    }
    const c = tile.content;
    if (c.type === TileContentType.DUNGEON || c.type === TileContentType.BOSS) {
      EventTable.handleCombat(this, tile, c);
    } else if (c.type === TileContentType.TREASURE) {
      EventTable.handleTreasure(this, tile, c);
    } else if (c.type === TileContentType.ALTAR) {
      EventTable.handleAltar(this, tile);
    } else if (c.type === TileContentType.LIGHTHOUSE) {
      EventTable.handleLighthouse(this, tile);
    } else if (c.type === TileContentType.PORTAL) {
      EventTable.handlePortal(this, tile, c);
    } else if (c.type === 'village') {
      EventTable.handleVillage(this, tile, c);
    } else if (c.type === 'merchant') {
      EventTable.handleMerchant(this, tile, c);
    } else if (c.type === 'ruin') {
      EventTable.handleRuin(this, tile, c);
    } else if (c.type === 'corruptedDeer') {
      EventTable.handleCorruptedDeer(this, tile, c);
    } else if (c.type === TileContentType.NPC) {
      EventTable.handleNPC(this, tile, c);
    }
  }
  // 切换地图
  _switchMap(targetMapName, q, r) {
    if (targetMapName === this.currentMapName) return;
    let targetMap = null;
    if (targetMapName === '新手村') targetMap = this.noviceVillage;
    else targetMap = this.map;
    if (!targetMap) return;
    this.currentMapName = targetMapName;
    this.player.setGridPos(q, r, targetMap);
    targetMap.revealAround(q, r, 5);
    // 相机同步
    if (this.camera) {
      const bottomLeft = this.hexToPixel(q, r, targetMap.tileSize);
      this.camera.x = MapConfig.PADDING - bottomLeft.x;
      this.camera.y = window.innerHeight - MapConfig.PADDING - bottomLeft.y;
    }
    // UI刷新
    this.ui.updatePartyStatus(this.selectedHeroes);
    // 强制重绘
    this.fsm.transition(GameState.MAP_EXPLORATION);
  }

  _startMission(missionName, maxTurns = 5) {
    this.currentMissionName = missionName;
    this.currentMaxTurns = maxTurns;
    this.turnCount = 0;
    this.ui.updateProgressBar(0, maxTurns);
    this.ui.updateProgressBarTitle(`🎯 ${missionName}`);
  }

  _executeTrapRoll() {
    const val = Math.max(1, Math.min(6, Math.round(rollSpeed(this.selectedHeroes[0], 0.5, 20).sampleRoll / 20 * 6)));
    EventTable.handleTrapResult(this, val);
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