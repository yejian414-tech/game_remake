// src/core/GameController.js
import { GameState, TurnPhase, MapConfig } from './Constants.js';
import { HexMap } from '../world/HexMap.js';
import { StateMachine } from './StateMachine.js';
import { CombatManager } from './CombatManager.js';
import { Enemy } from '../entities/Enemy.js';
import { Player } from '../entities/Player.js';
import { DataLoader } from '../data/DataLoader.js';

export class GameController {
  constructor(map, player, uiManager) {
    this.map = map;
    this.player = player;
    this.ui = uiManager;
    this.selectedHeroes = [];
    this.combatManager = null;
    this.fsm = new StateMachine(GameState.INITIALIZING);
    this.setupStates();
  }

  setupStates() {
    this.fsm.addState(GameState.CHARACTER_SELECT, {
      enter: () => this.ui.showCharacterSelect(hs => {
        this.selectedHeroes = hs.map(data => this._createHeroFromData(data));
        this.fsm.transition(GameState.MAP_GENERATION);
      }),
      exit: () => this.ui.hideCharacterSelect()
    });

    this.fsm.addState(GameState.MAP_GENERATION, {
      enter: () => {
        this.ui.showMapGeneration(this.selectedHeroes, () => {
          this.map = new HexMap(MapConfig.RADIUS, MapConfig.TILE_SIZE);
          this.player.setGridPos(-MapConfig.RADIUS, MapConfig.RADIUS, this.map);
          this.fsm.transition(GameState.MAP_EXPLORATION);
        });
      },
      exit: () => this.ui.hideMapGeneration()
    });

    this.fsm.addState(GameState.MAP_EXPLORATION, {
      enter: () => { this.ui.showMapUI(); this.startTurn(); }
    });

    this.fsm.addState(GameState.COMBAT, {
      enter: (enemyData) => {
        // 根据 enemyData 中若有 level 字段则使用，否则默认 1
        const combatEnemy = new Enemy(
          enemyData.name,
          enemyData.monsterType || 'goblin',
          enemyData.level || 1
        );
        this.combatManager = new CombatManager(
          this.selectedHeroes,
          [combatEnemy],
          this.ui
        );
        this.combatManager.init();
        this.ui.showCombatOverlay();
      },
      exit: () => {
        this.combatManager = null;
        this.ui.hideCombatOverlay();
      }
    });
  }

  // ── 英雄数据 → Player 实例 ────────────────────────────────

  _createHeroFromData(data) {
    const hero = new Player(data.name);
    hero.id = data.id;
    hero.maxHp = data.maxHp || data.hp;
    hero.hp = data.hp;
    hero.type = 'player';

    // 六维属性
    if (data.stats) {
      hero.strength = data.stats.strength ?? hero.strength;
      hero.toughness = data.stats.toughness ?? hero.toughness;
      hero.intellect = data.stats.intellect ?? hero.intellect;
      hero.awareness = data.stats.awareness ?? hero.awareness;
      hero.talent = data.stats.talent ?? hero.talent;
      hero.agility = data.stats.agility ?? hero.agility;
    }

    // 技能槽（最多 4 格）
    if (data.skillSlots) {
      data.skillSlots.forEach((sid, i) => {
        if (sid) {
          const skill = DataLoader.getSkill(sid);
          if (skill) hero.equipSkill(skill, i);
        }
      });
    }

    // 装备槽（最多 2 格，初始通常为空）
    // 若 data.equipSlots 有预置装备 id，可在此处 DataLoader.getItem(id)

    // 刷新派生属性
    hero.refreshDerivedStats();
    return hero;
  }

  // ── 主循环钩子 ────────────────────────────────────────────

  update(dt) {
    if (this.fsm.currentState === GameState.MAP_EXPLORATION) {
      this.player.update(dt);
    } else if (this.fsm.currentState === GameState.COMBAT) {
      if (this.combatManager) this.combatManager.update();
      this.selectedHeroes.forEach(h => h.update(dt));
      if (this.combatManager) this.combatManager.enemies.forEach(e => e.update(dt));
    }
  }

  render(ctx, camera) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (this.fsm.currentState === GameState.MAP_EXPLORATION) {
      this.map.draw(ctx, camera);
      ctx.save();
      ctx.translate(camera.x, camera.y);
      this.player.draw(ctx, this.map.tileSize);
      ctx.restore();
    } else if (this.fsm.currentState === GameState.COMBAT) {
      this.renderCombat(ctx);
    }
  }

  renderCombat(ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    this.selectedHeroes.forEach((h, i) => {
      h.targetX = 250;
      h.targetY = 200 + i * 150;
      h.draw(ctx, 50);
      this.drawHealthBar(ctx, h);
    });

    if (this.combatManager) {
      this.combatManager.enemies.forEach((e, i) => {
        e.targetX = ctx.canvas.width - 250;
        e.targetY = 200 + i * 150;
        e.draw(ctx, 50);
        this.drawHealthBar(ctx, e);
      });
    }
  }

  drawHealthBar(ctx, unit) {
    const barWidth = 80;
    ctx.fillStyle = '#333';
    ctx.fillRect(unit.x - barWidth / 2, unit.y + 45, barWidth, 8);
    ctx.fillStyle = unit.type === 'player' ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(
      unit.x - barWidth / 2,
      unit.y + 45,
      barWidth * (unit.hp / unit.maxHp),
      8
    );
  }

  startTurn() {
    this.player.movementPoints = 5;
    this.ui.updateMovementUI(this.player.movementPoints);
  }

  movePlayer(q, r) {
    if (this.fsm.currentState !== GameState.MAP_EXPLORATION) return;
    if (this.player.movementPoints <= 0) return;

    this.player.setGridPos(q, r, this.map);
    this.player.movementPoints--;
    this.ui.updateMovementUI(this.player.movementPoints);

    const tile = this.map.getTile(q, r);
    if (tile && tile.content?.type === 'enemy') {
      console.log('遭遇敌人！触发跳转...');
      this.fsm.transition(GameState.COMBAT, tile.content);
      tile.content = null;
    }
  }

  onEndTurnBtnClick() { this.startTurn(); }
}