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
    this.trapCooldown = 0; // 队友新增：陷阱冷却

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

  // ── 战斗进入 / 退出（已对接 React） ───────────────────────

  _enterCombat(contentData) {
    const isBoss = contentData.type === TileContentType.BOSS || contentData.type === 'boss';
    const level = contentData.level ?? 1;

    const statOverrides = isBoss
      ? { strength: 20 + level * 6, toughness: 16 + level * 5, agility: 10 + level * 2 }
      : {};

    const enemyName = contentData.name || (isBoss ? '精英首领' : '游荡的怪物');
    const enemy = new Enemy(enemyName, isBoss ? 'boss' : 'dungeon', level, statOverrides);

    // ⚠️ 分配唯一ID，这是 React 选中敌人的关键
    enemy.id = 'e1_' + Date.now();

    this.combatManager = new CombatManager(this.selectedHeroes, [enemy], this.ui);
    this.combatManager.init();

    // ── 核心：调用缝合版 UIManager 的方法启动 React ──
    this.ui.showCombatOverlay(this.combatManager);

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
      if (this.combatManager) {
        this.combatManager.update();
        // ── 核心：每一帧同步数据给 React 刷新特效 ──
        this.ui.updateCombatUI(this.combatManager);
      }
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
         this.map.draw(ctx, camera);
         ctx.save();
         ctx.translate(camera.x, camera.y);
         this.player.draw(ctx, this.map.tileSize);
         ctx.restore();
      }
    } else if (state === GameState.COMBAT) {
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

    if (this.trapCooldown > 0) this.trapCooldown--; // 陷阱冷却递减
  }

  onEndTurnBtnClick() { this._startTurn(); }

  // ── 玩家移动 ─────────────────────────────────────────────

  movePlayer(q, r) {
    if (this.fsm.currentState !== GameState.MAP_EXPLORATION) return;

    const dq = q - this.player.q;
    const dr = r - this.player.r;
    const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));

    // 保留你的友好距离提示
    if (dist !== 1) {
        if (dist > 1) {
            if (this.map.getTile(q, r)?.content) {
                alert("距离目标太远了！请一步一格地走过去。");
            }
        }
        return;
    }

    const tile = this.map.getTile(q, r);
    if (!tile) return;

    const moveCost = tile.type.moveCost ?? 1;
    if (this.player.movementPoints < moveCost) {
      alert(`行动力不足！还需 ${moveCost}，剩余 ${this.player.movementPoints}。请点击结束回合。`);
      return;
    }

    this.player.setGridPos(q, r, this.map);
    this.player.movementPoints -= moveCost;
    this.ui.updateMovementUI(this.player.movementPoints);
    this.map.revealAround(q, r, 2);

    this._handleTileContent(tile);
  }

  // ── 缝合版：玩家事件处理（含队友陷阱/灯塔/祭坛） ─────────────

  _handleTileContent(tile) {
    // 1. 无内容：判定陷阱（队友逻辑）
    if (!tile.content) {
      if (this.trapCooldown === 0 && Math.random() <= 0.15) {
        this.trapCooldown = 2;
        this._handleTrapEvent();
      }
      return;
    }

    const content = tile.content;

    // 2. 敌人判定：采用弹窗询问（队友逻辑）+ 你的战斗进入
    if (content.type === TileContentType.DUNGEON || content.type === TileContentType.BOSS || content.type === 'enemy') {
        const isBoss = content.type === TileContentType.BOSS || content.type === 'boss';
        this.ui.showEvent(
          isBoss ? "⚠️ Boss 出现！" : "⚔️ 遭遇敌人",
          `前方发现 ${content.name}，是否迎战？`,
          [
            {
              text: "⚔️ 开战！",
              onClick: () => {
                tile.content = null;
                this.fsm.transition(GameState.COMBAT, content);
              }
            },
            {
              text: "🏃 撤退",
              onClick: () => {
                this.player.movementPoints = 0;
                this.ui.updateMovementUI(0);
              }
            }
          ]
        );
    }
    // 3. 宝箱判定
    else if (content.type === TileContentType.TREASURE || content.type === 'treasure') {
        tile.content = null;
        this.ui.showEvent("🎁 获得奖励", `你开启了宝箱，并获得了战利品。`, [{ text: "确定", onClick: () => {} }]);
    }
    // 4. 祭坛判定
    else if (content.type === TileContentType.ALTAR) {
        this.ui.showEvent("🔮 神秘祭坛", "你是否要在此祈祷？", [
            { text: "🙏 祈祷", onClick: () => { tile.content = null; this._handleAltarPray(); } },
            { text: "🚶 离开", onClick: () => {} }
        ]);
    }
    // 5. 灯塔判定
    else if (content.type === TileContentType.LIGHTHOUSE) {
        this.ui.showEvent("🗼 灯塔", "选择一个方向远眺...", [
            { text: "右上", onClick: () => { tile.content = null; this._revealDirection(1, -1); } },
            { text: "右下", onClick: () => { tile.content = null; this._revealDirection(1, 1); } },
            { text: "左下", onClick: () => { tile.content = null; this._revealDirection(-1, 1); } },
            { text: "左上", onClick: () => { tile.content = null; this._revealDirection(-1, -1); } }
        ]);
    }
  }

  // ── 辅助事件处理 ────────────────────────────────────────

  _handleTrapEvent() {
    const hero = this.selectedHeroes[0];
    this.ui.showEvent("🪤 隐藏陷阱", "你踩到了机关！", [{
        text: "🎲 判定逃脱",
        onClick: () => {
            const result = rollSpeed(hero, 0.5, 20);
            const diceValue = Math.max(1, Math.min(6, Math.ceil(result.sampleRoll / 20 * 6)));
            if (diceValue <= 2) {
                const damage = Math.floor(hero.maxHp * 0.15);
                hero.hp = Math.max(0, hero.hp - damage);
                this.ui.showEvent("💥 触发！", `判定为 ${diceValue}，受到 ${damage} 伤害！`, [{ text: "确定", onClick: () => {} }]);
            } else {
                this.ui.showEvent("✨ 安全", `判定为 ${diceValue}，你成功躲开了！`, [{ text: "确定", onClick: () => {} }]);
            }
        }
    }]);
  }

  _handleAltarPray() {
    const hero = this.selectedHeroes[0];
    const healAmount = Math.floor(hero.maxHp * 0.4);
    hero.hp = Math.min(hero.maxHp, hero.hp + healAmount);
    this.ui.showEvent("✨ 圣光愈合", `祈祷获得回应，恢复了 ${healAmount} HP`, [{ text: "继续", onClick: () => {} }]);
  }

  _revealDirection(dirQ, dirR) {
    const originQ = this.player.q;
    const originR = this.player.r;
    const radius = 6;
    for (let dq = -radius; dq <= radius; dq++) {
        for (let dr = -radius; dr <= radius; dr++) {
            const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
            if (dist > radius) continue;
            const q = originQ + dq;
            const r = originR + dr;
            const tile = this.map.getTile(q, r);
            if (!tile) continue;
            const inDirection = (dirQ === 1 && dirR === -1 && dq > 0 && dr < 0) ||
                              (dirQ === 1 && dirR === 1 && dq > 0 && dr > 0) ||
                              (dirQ === -1 && dirR === 1 && dq < 0 && dr > 0) ||
                              (dirQ === -1 && dirR === -1 && dq < 0 && dr < 0);
            if (inDirection) tile.isRevealed = true;
        }
    }
  }

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