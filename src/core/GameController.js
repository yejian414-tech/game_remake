// src/core/GameController.js
import { GameState, MapConfig, TurnConfig, MapPresets } from './Constants.js';
import { HexMap, createMapByPreset } from '../world/HexMap.js';
import { TileContentType, makePortal, hexToPixel, makeBoss, TileType, makeNPC, makeVillage, makeMerchant, makeRuin, makeCorruptedDeer } from '../world/Tile.js';
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
import { findPath, getReachableTiles } from '../utils/Pathfinder.js';   // ← 新增：A* 寻路

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
    this._isMoving = false;   // ← 新增：路径动画锁，移动中屏蔽新点击
    this.rangeHighlight = null;
    this.gameStory = new GameStory(ui);
    this.fsm = new StateMachine(GameState.INITIALIZING);
    this._setupStates();
  }

  _setupStates() {
    this.fsm.addState(GameState.CHARACTER_SELECT, {
      enter: () => this.ui.showCharacterSelect(heroes => {
        this.selectedHeroes = heroes.map(d => this._createHeroFromData(d));
        this.fsm.transition(GameState.STORY);
      }),
      exit: () => this.ui.hideCharacterSelect(),
    });

    this.fsm.addState(GameState.STORY, {
      enter: () => this.gameStory.showStory('INTRO', () => this.fsm.transition(GameState.MAP_GENERATION)),
      exit: () => this.gameStory.hideStory(),
    });

    this.fsm.addState(GameState.MAP_GENERATION, {
      enter: () => this.ui.showMapGeneration(this.selectedHeroes, () => {
        // 主地图 & 新手村
        this.map = createMapByPreset('main');
        this.noviceVillage = createMapByPreset('novice');

        // 出生地坐标
        const mainQ = -MapPresets.main.radius + 1;
        const mainR = MapPresets.main.radius - 1;
        const noviceQ = -MapPresets.novice.radius + 1;
        const noviceR = MapPresets.novice.radius - 1;

        // ── 强制出生格为草地，防止随机地形导致无法行走 ──────────────
        const mainSpawnTile = this.map.getTile(mainQ, mainR);
        if (mainSpawnTile) mainSpawnTile.type = TileType.GRASS;
        const noviceSpawnTile = this.noviceVillage.getTile(noviceQ, noviceR);
        if (noviceSpawnTile) noviceSpawnTile.type = TileType.GRASS;

        // 双向传送阵
        this.map.placeContent(mainQ, mainR, makePortal('新手村', noviceQ, noviceR), 0);
        this.noviceVillage.placeContent(noviceQ, noviceR, makePortal('主地图', mainQ, mainR), 0);

        // 批量放置 NPC
        for (const npc of NPC_LIST) {
          const targetMap = npc.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(npc.q, npc.r);
          if (tile && tile.type === TileType.GRASS) {
            targetMap.placeContent(npc.q, npc.r, makeNPC(npc.name, npc.dialogue, npc.options || {}), 0);
          }
        }

        // 批量放置村庄
        for (const village of VILLAGE_LIST) {
          const targetMap = village.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(village.q, village.r);
          if (tile && tile.type === TileType.GRASS) {
            targetMap.placeContent(village.q, village.r, makeVillage(village.name), 0);
          }
        }

        // 批量放置商人
        for (const merchant of MERCHANT_LIST) {
          const targetMap = merchant.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(merchant.q, merchant.r);
          if (tile && tile.type === TileType.GRASS) {
            targetMap.placeContent(merchant.q, merchant.r, makeMerchant(merchant.name), 0);
          }
        }

        // 批量放置遗迹
        for (const ruin of RUIN_LIST) {
          const targetMap = ruin.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(ruin.q, ruin.r);
          if (tile && tile.type === TileType.GRASS) {
            targetMap.placeContent(ruin.q, ruin.r, makeRuin(ruin.name, ruin.enemyName), 0);
          }
        }

        // 批量放置被腐化的鹿
        for (const deer of CORRUPTED_DEER_LIST) {
          const targetMap = deer.map === 'main' ? this.map : this.noviceVillage;
          const tile = targetMap.getTile(deer.q, deer.r);
          if (tile && tile.type === TileType.GRASS) {
            targetMap.placeContent(deer.q, deer.r, makeCorruptedDeer(deer.name), 0);
          }
        }

        // 玩家出生在新手村
        this.currentMapName = '新手村';
        this.player.setGridPos(noviceQ, noviceR, this.noviceVillage);
        this.noviceVillage.revealAround(noviceQ, noviceR, 5);
        this.fsm.transition(GameState.MAP_EXPLORATION);
      }),
      exit: () => this.ui.hideMapGeneration(),
    });

    this.fsm.addState(GameState.MAP_EXPLORATION, {
      enter: () => { this.turnCount = 0; this.ui.showMapUI(); this._startTurn(); },
    });

    this.fsm.addState(GameState.COMBAT, {
      enter: contentData => this._enterCombat(contentData),
      exit: () => {
        const won = this.combatManager?.phase === 'WIN';
        this._exitCombat();
        this.ui.updatePartyStatus(this.selectedHeroes);
        if (won) {
          const loot = rollRandomItem();
          setTimeout(() => {
            this.ui.showChestReward(loot, () => {
              this.ui.showLootAssign(loot, this.selectedHeroes, ({ heroIndex, action }) => {
                const hero = this.selectedHeroes?.[heroIndex];
                if (!hero) return;
                if (action === 'put') hero.inventory.push(loot);
                else if (action === 'equip') { hero.equip?.(loot, Math.max(0, Math.min(1, loot.slot ?? 0))); hero.refreshDerivedStats?.(); }
                this.ui.updatePartyStatus(this.selectedHeroes);
              });
            });
          }, 300);
        }
      },
    });

    this.fsm.addState(GameState.GAME_OVER, {
      enter: () => this.ui.showGameOver(),
      exit: () => { },
    });
  }

  _enterCombat(contentData) {
    const isBoss = contentData.type === TileContentType.BOSS || contentData.type === 'boss';
    const level = contentData.level ?? 1;
    const enemy = new Enemy(
      contentData.name || (isBoss ? 'Elite Boss' : 'Monster'),
      isBoss ? 'boss' : 'dungeon',
      level,
      isBoss ? { strength: 20 + level * 6, toughness: 16 + level * 5, agility: 10 + level * 2 } : {}
    );
    enemy.id = 'e1_' + Date.now();
    this.combatManager = new CombatManager(this.selectedHeroes, [enemy], this.ui);
    this.combatManager.init();
    this.ui.showCombatOverlay(this.combatManager);
  }

  _exitCombat() {
    this.combatManager = null;
    this.ui.hideCombatOverlay();
  }

  update(dt) {
    if (this.fsm.currentState === GameState.MAP_EXPLORATION) {
      this.player.update(dt);
    } else if (this.fsm.currentState === GameState.COMBAT) {
      this.selectedHeroes.forEach(h => h.update(dt));
      this.combatManager?.enemies.forEach(e => e.update(dt));
    }
  }

  render(ctx, camera) {
    if (this.fsm.currentState === GameState.MAP_EXPLORATION) {
      const currentMap = this.currentMapName === '新手村' ? this.noviceVillage : this.map;
      Renderer.renderExploration(ctx, camera, currentMap, this.player, this.rangeHighlight);
    } else if (this.fsm.currentState === GameState.COMBAT) {
      Renderer.renderCombat(ctx, this.selectedHeroes, this.combatManager);
    }
  }

  _startTurn() {
    this.rangeHighlight = null;
    this.turnCount += 1;
    this.ui.updateProgressBar(this.turnCount, this.currentMaxTurns);

    const roller = this.selectedHeroes.length > 0
      ? this.selectedHeroes.reduce((a, b) => ((a.speed ?? 0) >= (b.speed ?? 0) ? a : b))
      : this.player;
    const total = rollSpeed(roller, 0.5, 20).gradeIndex + 1;
    this.player.movementPoints = total;
    this.ui.updateMovementUI(total);
    this.ui.updatePartyStatus(this.selectedHeroes);

    if (this.trapCooldown > 0) this.trapCooldown--;

    // Boss 惩罚阶段：每回合扣除英雄最大血量的 5%
    if (this.bossModePenaltyActive) {
      const damage = Math.max(1, Math.floor(this.selectedHeroes[0]?.maxHp || 100) * 0.05);
      for (const hero of this.selectedHeroes) {
        hero.hp = Math.max(0, hero.hp - damage);
      }
      if (!this.bossModePenaltyWarned) {
        this.bossModePenaltyWarned = true;
        this.ui.showEvent(
          '⚠️ 威胁',
          `每一刻的耽搁都在削弱你的生命力！\n每名英雄扣除 -${damage} HP (最大生命值的5%)`,
          [{ text: '继续', onClick: () => { } }]
        );
      }
      this.ui.updatePartyStatus(this.selectedHeroes);
    }

    if (!this.bossMode && this.turnCount === this.currentMaxTurns) {
      // 进入 boss 模式
      this.bossMode = true;
      this.bossModePenaltyActive = true;
      this.turnCount = 0;
      this.currentMaxTurns = 10;
      this.ui.updateBossMode();
      this.ui.setProgressBarCritical();

      document.body.classList.add('shake');
      setTimeout(() => document.body.classList.remove('shake'), 500);

      this.map.revealAround(20, 0, 10);

      for (const tile of this.map.tiles.values()) {
        const dq = tile.q - 20, dr = tile.r - 0, ds = -dq - dr;
        if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds)) <= 4) {
          tile.type = TileType.FOREST;
        }
      }
      const bossTile = this.map.getTile(20, 0);
      if (bossTile) this.map.placeContent(20, 0, makeBoss('Final Boss', 10));

    } else if (this.bossMode && this.turnCount === this.currentMaxTurns) {
      this.fsm.transition(GameState.GAME_OVER);
    }
  }

  onEndTurnBtnClick() { this._startTurn(); }

  // ── 寻路移动（替换旧的直线限制移动）────────────────────────────

  /**
   * 玩家点击目标格后触发，使用 A* 寻路并逐步动画移动。
   *
   * 寻路规则：
   *   - moveCost = Infinity 的地形（森林/山脉/屏障）不可通行
   *   - 带事件内容的格子（地牢/宝箱/灯塔…）不能作为途经点，只能作为终点
   *   - 总路径代价不能超过当前移动力
   */
  movePlayer(q, r) {
    if (this.fsm.currentState !== GameState.MAP_EXPLORATION) return;
    if (q === this.player.q && r === this.player.r) return;
    if (this._isMoving) return; // 动画进行中，忽略新点击

    const curMap = this.currentMapName === '新手村' ? this.noviceVillage : this.map;

    // 目标格地形必须可通行
    const tile = curMap.getTile(q, r);
    if (!tile || !isFinite(tile.type.moveCost)) return;

    // A* 寻路，受当前移动力约束
    const result = findPath(
      curMap,
      this.player.q, this.player.r,
      q, r,
      this.player.movementPoints,
    );

    // 不可达 / 移动力不足 → 忽略
    if (!result || result.path.length === 0) {
      // 判断目标格在无限移动力下是否可达（即：地形可通行但步数不足）
      const canReachUnlimited = findPath(curMap, this.player.q, this.player.r, q, r, Infinity);
      if (canReachUnlimited) {
        // 步数不足：展示可移动范围红线
        this.rangeHighlight = getReachableTiles(
          curMap,
          this.player.q,
          this.player.r,
          this.player.movementPoints,
        );
      }
      return;
    }
    this._walkPath(result.path, curMap);

  }

  /**
   * 按路径逐格移动玩家，每步间隔 150ms（视觉动画）。
   * 只在抵达最后一格时触发 tile content 事件。
   *
   * @param {Array<{q:number, r:number}>} path  不含起点的路径格数组
   * @param {HexMap} curMap
   */
  _walkPath(path, curMap) {
    this._isMoving = true;
    this.rangeHighlight = null;
    let stepIndex = 0;

    const doStep = () => {
      if (stepIndex >= path.length) {
        this._isMoving = false;
        return;
      }

      const { q, r } = path[stepIndex];
      stepIndex++;

      const tile = curMap.getTile(q, r);
      if (!tile) { this._isMoving = false; return; }

      this.player.setGridPos(q, r, curMap);
      this.player.movementPoints -= tile.type.moveCost;
      this.ui.updateMovementUI(this.player.movementPoints);
      curMap.revealAround(q, r, 2);
      this.ui.updatePartyStatus(this.selectedHeroes);

      const isLast = stepIndex >= path.length;
      if (isLast) {
        this._isMoving = false;
        this._handleTileContent(tile); // 仅终点触发事件
      } else {
        setTimeout(doStep, 150); // 每步间隔 150ms
      }
    };

    doStep();
  }

  // ── Tile 事件处理 ────────────────────────────────────────────────

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
    } else if (c.type === TileContentType.VILLAGE) {
      EventTable.handleVillage(this, tile, c);
    } else if (c.type === TileContentType.MERCHANT) {
      EventTable.handleMerchant(this, tile, c);
    } else if (c.type === TileContentType.RUIN) {
      EventTable.handleRuin(this, tile, c);
    } else if (c.type === TileContentType.CORRUPTED_DEER) {
      EventTable.handleCorruptedDeer(this, tile, c);
    } else if (c.type === TileContentType.NPC) {
      EventTable.handleNPC(this, tile, c);
    }
  }

  // ── 切换地图 ─────────────────────────────────────────────────────

  _switchMap(targetMapName, q, r) {
    if (targetMapName === this.currentMapName) return;
    const targetMap = targetMapName === '新手村' ? this.noviceVillage : this.map;
    if (!targetMap) return;
    this.currentMapName = targetMapName;
    this.player.setGridPos(q, r, targetMap);
    targetMap.revealAround(q, r, 5);
    if (this.camera) {
      const bottomLeft = hexToPixel(q, r, targetMap.tileSize);
      this.camera.x = MapConfig.PADDING - bottomLeft.x;
      this.camera.y = window.innerHeight - MapConfig.PADDING - bottomLeft.y;
    }
    this.ui.updatePartyStatus(this.selectedHeroes);
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
    const radius = 6;
    for (let dq = -radius; dq <= radius; dq++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) > radius) continue;
        const tile = this.map.getTile(this.player.q + dq, this.player.r + dr);
        if (tile && (
          (dirQ === 1 && dirR === -1 && dq > 0 && dr < 0) ||
          (dirQ === 1 && dirR === 1 && dq > 0 && dr > 0) ||
          (dirQ === -1 && dirR === 1 && dq < 0 && dr > 0) ||
          (dirQ === -1 && dirR === -1 && dq < 0 && dr < 0)
        )) {
          tile.isRevealed = true;
        }
      }
    }
  }

// ── Hero creation — supports new weapon slots and legacy skill slots ──────
  _createHeroFromData(data) {
    const hero = new Player(data.name);
    hero.id = data.id;
    hero.maxHp = data.maxHp ?? data.hp ?? 100;
    hero.hp = hero.maxHp;
    hero.type = 'player';

    // Six core stats (vitality replaces toughness; falls back for legacy data)
    if (data.stats) {
      const s = data.stats;
      hero.strength  = s.strength  ?? hero.strength;
      hero.vitality  = s.vitality  ?? s.toughness ?? hero.vitality;
      hero.intellect = s.intellect ?? hero.intellect;
      hero.awareness = s.awareness ?? hero.awareness;
      hero.talent    = s.talent    ?? hero.talent;
      hero.agility   = s.agility   ?? hero.agility;
    }

    // Store base values so refreshDerivedStats can reset cleanly on weapon swap
    hero._baseStrength  = hero.strength;
    hero._baseVitality  = hero.vitality;
    hero._baseAgility   = hero.agility;
    hero._baseIntellect = hero.intellect;
    hero._baseAwareness = hero.awareness;
    hero._baseTalent    = hero.talent;

    // New weapon slots system
    if (data.weaponSlots && Array.isArray(data.weaponSlots)) {
      hero.weaponSlots = [null, null];
      data.weaponSlots.forEach((weaponId, i) => {
        if (weaponId) {
          const weapon = DataLoader.getWeapon?.(weaponId);
          if (weapon) hero.weaponSlots[i] = weapon;
        }
      });
      hero.equippedWeaponIndex = data.equippedWeaponIndex ?? 0;
    } else if (data.skillSlots) {
      // Legacy fallback: load old-style skill slots
      data.skillSlots.forEach((sid, i) => {
        if (sid) {
          const skill = DataLoader.getSkill(sid);
          if (skill) hero.equipSkill?.(skill, i);
        }
      });
    }

    hero.refreshDerivedStats();
    return hero;
  }
}
