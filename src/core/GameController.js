// src/core/GameController.js
import { GameState, MapConfig, TurnConfig } from './Constants.js';
import { HexMap } from '../world/HexMap.js';
import { TileContentType } from '../world/Tile.js';
import { StateMachine } from './StateMachine.js';
import { CombatManager } from './CombatManager.js';
import { Enemy } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { DataLoader } from '../data/DataLoader.js';
import { rollSpeed, formatRoll } from './Dice.js';
import { Renderer } from '../rendering/Renderer.js';

export class GameController {
  constructor(map, player, ui) {
    this.map = map;
    this.player = player;
    this.ui = ui;

    this.selectedHeroes = [];
    this.combatManager = null;
    this.turnCount = 0;

    this.fsm = new StateMachine(GameState.INITIALIZING);
    this._setupStates();
  }

  // ── 状态机配置 ───────────────────────────────────────────

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
      exit: () => this._exitCombat(),
    });
  }

  // ── 战斗进入 / 退出 ──────────────────────────────────────

  _enterCombat(contentData) {
    const isBoss = contentData.type === TileContentType.BOSS;
    const level = contentData.level ?? 1;

    const statOverrides = isBoss
      ? { strength: 20 + level * 6, toughness: 16 + level * 5, agility: 10 + level * 2 }
      : {};

    const enemy = new Enemy(
      contentData.name,
      isBoss ? 'boss' : 'dungeon',
      level,
      statOverrides
    );

    this.combatManager = new CombatManager(this.selectedHeroes, [enemy], this.ui);
    this.combatManager.init();
    this.ui.showCombatOverlay();

    const tag = isBoss
      ? `⚠️ Boss 战！`
      : `⚔️ 地牢 Lv.${level}`;
    console.log(`[Combat] ${tag} → ${contentData.name}`);
  }

  _exitCombat() {
    this.combatManager = null;
    this.ui.hideCombatOverlay();
  }

  // ── 游戏循环钩子 ─────────────────────────────────────────

  update(dt) {
    const state = this.fsm.currentState;

    if (state === GameState.MAP_EXPLORATION) {
      this.player.update(dt);

    } else if (state === GameState.COMBAT) {
      this.combatManager?.update();
      this.selectedHeroes.forEach(h => h.update(dt));
      this.combatManager?.enemies.forEach(e => e.update(dt));
    }
  }

  render(ctx, camera) {
    const state = this.fsm.currentState;

    if (state === GameState.MAP_EXPLORATION) {
      Renderer.renderExploration(ctx, camera, this.map, this.player);

    } else if (state === GameState.COMBAT) {
      Renderer.renderCombat(ctx, this.selectedHeroes, this.combatManager);
    }
  }

  // ── 回合管理 ─────────────────────────────────────────────

  _startTurn() {
    this.turnCount += 1;
    this.ui.updateTurnCount(this.turnCount);
    this.ui.updateProgressBar(this.turnCount, TurnConfig.MAX_TURNS);

    const roller = this.selectedHeroes.length > 0
      ? this.selectedHeroes.reduce((a, b) => ((a.speed ?? 0) >= (b.speed ?? 0) ? a : b))
      : this.player;

    const result = rollSpeed(roller, 0.5, 20);
    const baseMove = result.gradeIndex + 1;
    const equipBonus = this.selectedHeroes.reduce((sum, hero) =>
      sum + hero.equipSlots.reduce((s, item) => s + (item?.moveBonus ?? 0), 0), 0);

    const total = baseMove + equipBonus;
    this.player.movementPoints = total;
    this.ui.updateMovementUI(total);

    console.log(
      `[Turn ${this.turnCount}] 移动力判定 ${formatRoll(result)}` +
      ` | 装备+${equipBonus} → 合计 ${total}`
    );
  }

  onEndTurnBtnClick() { this._startTurn(); }

  // ── 玩家移动 ─────────────────────────────────────────────

  movePlayer(q, r) {
    if (this.fsm.currentState !== GameState.MAP_EXPLORATION) return;

    const dq = q - this.player.q;
    const dr = r - this.player.r;
    const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
    if (dist !== 1) return;

    const tile = this.map.getTile(q, r);
    if (!tile) return;

    const moveCost = tile.type.moveCost ?? 1;
    if (this.player.movementPoints < moveCost) {
      console.log(`[Move] 行动力不足（需要 ${moveCost}，剩余 ${this.player.movementPoints}）`);
      return;
    }

    this.player.setGridPos(q, r, this.map);
    this.player.movementPoints -= moveCost;
    this.ui.updateMovementUI(this.player.movementPoints);
    this.map.revealAround(q, r, 2);

    this._handleTileContent(tile);
  }

  _handleTileContent(tile) {
    if (!tile.content) return;
    const content = tile.content;

    if (content.type === TileContentType.DUNGEON || content.type === TileContentType.BOSS) {
      tile.content = null;
      this.fsm.transition(GameState.COMBAT, content);

    } else if (content.type === TileContentType.TREASURE) {
      tile.content = null;
      const tierLabel = ['', '普通', '稀有', '史诗'][content.lootTier] ?? '普通';
      alert(`🎁 获得 ${tierLabel} 宝箱奖励！（Tier ${content.lootTier}）`);
      console.log(`[Treasure] 拾取 ${content.name}（Tier ${content.lootTier}）`);
    }
  }

  // ── 英雄工厂 ─────────────────────────────────────────────

  _createHeroFromData(data) {
    const hero = new Player(data.name);
    hero.id = data.id;
    hero.maxHp = data.maxHp ?? data.hp;
    hero.hp = data.hp;
    hero.type = 'player';

    if (data.stats) {
      const s = data.stats;
      hero.strength = s.strength ?? hero.strength;
      hero.toughness = s.toughness ?? hero.toughness;
      hero.intellect = s.intellect ?? hero.intellect;
      hero.awareness = s.awareness ?? hero.awareness;
      hero.talent = s.talent ?? hero.talent;
      hero.agility = s.agility ?? hero.agility;
    }

    data.skillSlots?.forEach((sid, i) => {
      if (!sid) return;
      const skill = DataLoader.getSkill(sid);
      if (skill) hero.equipSkill(skill, i);
    });

    hero.refreshDerivedStats();
    return hero;
  }
}