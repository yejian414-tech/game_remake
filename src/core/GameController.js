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
    // 兼容多种 Boss 判定方式
    const isBoss = contentData.type === TileContentType.BOSS || contentData.type === 'boss';
    const level = contentData.level ?? 1;

    const statOverrides = isBoss
      ? { strength: 20 + level * 6, toughness: 16 + level * 5, agility: 10 + level * 2 }
      : {};

    // 创建敌人，如果没有名字给个默认名字
    const enemyName = contentData.name || (isBoss ? '精英首领' : '游荡的怪物');
    const enemy = new Enemy(enemyName, isBoss ? 'boss' : 'dungeon', level, statOverrides);
    
    // ⚠️ 给敌人分配唯一ID，这是你的 React 战斗UI 能选中敌人的关键！
    enemy.id = 'e1_' + Date.now(); 

    this.combatManager = new CombatManager(this.selectedHeroes, [enemy], this.ui);
    this.combatManager.init();
    this.ui.showCombatOverlay();

    console.log(`[Combat] 触发战斗 → ${enemyName}`);
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
      if (Renderer && Renderer.renderExploration) {
         Renderer.renderExploration(ctx, camera, this.map, this.player);
      } else {
         // Fallback rendering
         ctx.fillStyle = '#1a1a2e';
         ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
         this.map.draw(ctx, camera);
         ctx.save(); 
         ctx.translate(camera.x, camera.y);
         this.player.draw(ctx, this.map.tileSize);
         ctx.restore();
      }
    } else if (state === GameState.COMBAT) {
      // 兼容你们小组的原版渲染结构，将背景托付给原版，交互界面交给你的 React
      if (Renderer && Renderer.renderCombat) {
        Renderer.renderCombat(ctx, this.selectedHeroes, this.combatManager);
      }
    }
  }

  // ── 回合管理 ─────────────────────────────────────────────

  _startTurn() {
    this.turnCount += 1;
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
    
    // ⚠️ 极其关键的体验优化：限制只能走1格，如果点远了给提示！
    if (dist !== 1) { 
        if (dist > 1) {
            console.log("【提示】距离太远！每次只能移动到相邻的1个格子，请一步一步走过去。");
            if (this.map.getTile(q, r)?.content) {
                alert("距离怪物太远了！必须一格一格地走过去，踩在怪物身上才能触发战斗。");
            }
        }
        return; 
    }

    const tile = this.map.getTile(q, r);
    if (!tile) return;

    const moveCost = tile.type.moveCost ?? 1;
    if (this.player.movementPoints < moveCost) {
      alert(`行动力不足！你需要 ${moveCost} 点行动力，但只剩 ${this.player.movementPoints} 点。请点击右下角的“结束回合”。`);
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

    // ⚠️ 核心修复：兼容地图生成的所有可能的怪物标识字符串
    if (
        content.type === TileContentType.DUNGEON || 
        content.type === TileContentType.BOSS || 
        content.type === 'enemy' || 
        content.type === 'boss' || 
        content.type === 'monster'
    ) {
      tile.content = null; // 踩上去后把怪从地图上抹掉
      this.fsm.transition(GameState.COMBAT, content);

    } else if (content.type === TileContentType.TREASURE || content.type === 'treasure') {
      tile.content = null;
      alert(`🎁 获得 宝箱奖励！`);
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

    if (data.skillSlots) {
        data.skillSlots.forEach((sid, i) => {
            if (!sid) return;
            const skill = DataLoader.getSkill(sid);
            if (skill) hero.equipSkill(skill, i);
        });
    }

    hero.refreshDerivedStats();
    return hero;
  }
}