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
    this.trapCooldown = 0;

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
    //陷阱冷却
    if (this.trapCooldown > 0) {
      this.trapCooldown--;
    }
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
  // ── 玩家事件 ─────────────────────────────────────────────
  _handleTileContent(tile) {
    if (!tile.content) {
      //触发概率
      if (this.trapCooldown === 0 && Math.random() <= 0.15) {
        this.trapCooldown = 2;
        const hero = this.selectedHeroes[0];
        this.ui.showEvent(
          "🪤 Hidden Trap",
          "A hidden trap clicks beneath your feet.",
          [
            {
              text: "🎲 Roll The Dice",
              onClick: () => {
                const result = rollSpeed(hero, 0.5, 20);
                const diceValue = Math.max(
                  1,
                  Math.min(6, Math.ceil(result.sampleRoll / 20 * 6))
                );
                if (diceValue <= 2) {
                  const damage = Math.floor(hero.maxHp * 0.15);
                  hero.hp = Math.max(0, hero.hp - damage);
                  this.ui.showEvent(
                    "💥 Trap Triggered",
                    `You rolled ${diceValue}. You take ${damage} damage!`,
                    [
                      { text: "OK", onClick: () => {} }
                    ]
                  );
                } else {
                  this.ui.showEvent(
                    "✨ Safe",
                    `You rolled ${diceValue}. You avoided the trap.`,
                    [
                      { text: "OK", onClick: () => {} }
                    ]
                  );
                }
              }
            }
          ]
        );
      }
      return;
    }
    const content = tile.content;
    if (content.type === TileContentType.DUNGEON || content.type === TileContentType.BOSS) {
        const isBoss = content.type === TileContentType.BOSS;
        const title = isBoss ? "⚠️ Boss 出现！" : "⚔️ Facing敌人";
        const desc = isBoss
          ? `你遭遇了强大的 ${content.name}，要迎战吗？`
          : `Ahead is a ${content.name}（Lv.${content.level}），Do you want to fight？`;
      
        this.ui.showEvent(
          title,
          desc,
          [
            {
              text: "⚔️ For the treasure！",
              onClick: () => {
                tile.content = null;
                this.fsm.transition(GameState.COMBAT, content);
              }
            },
            {
              text: "🏃 Rapid backward advance",
              onClick: () => {
                this.player.movementPoints = 0;
                this.ui.updateMovementUI(0);
        
                this.ui.showEvent(
                  "🏃 you bolt from battle",
                  "Overcome by fear, leaving no strength to act",
                  [
                    {
                      text: "Confirm",
                      onClick: () => {}
                    }
                  ]
                );
              }
            }
          ]
        );
      }else if (content.type === TileContentType.TREASURE) {
        tile.content = null;
        const tierLabel = ['', '普通', '稀有', '史诗'][content.lootTier] ?? '普通';
        this.ui.showEvent(
          "🎁 Treasure? Ahead",
          "Probably safe",
          [
            {
              text: "Open",
              onClick: () => {
                console.log("获得奖励！");
                tile.content = null;
              }
            },
            {
              text: "Not today",
              onClick: () => {
                console.log("你选择离开。");
              }
            }
          ]
        );
      console.log(`[Treasure] 拾取 ${content.name}（Tier ${content.lootTier}）`);
      }else if (content.type === TileContentType.ALTAR) {
        this.ui.showEvent(
          "🔮 Mysterious Altar",
          "An ancient altar stands before you.",
          [
            {
              text: "🙏 Offer Prayer",
              onClick: () => {
                tile.content = null;
                this._handleAltarPray();
              }
            },
            {
              text: "🚶 Walk Away Quietly",
              onClick: () => {}
            }
          ]
        );
      }else if (content.type === TileContentType.LIGHTHOUSE) {
        this.ui.showEvent(
          "🗼 Lighthouse",
          "Choose a direction",
          [
            {
              text: "右上",
              onClick: () => {
                tile.content = null;
                this._revealDirection(1, -1);
              }
            },
            {
              text: "右下",
              onClick: () => {
                tile.content = null;
                this._revealDirection(1, 1);
              }
            },
            {
              text: "左下",
              onClick: () => {
                tile.content = null;
                this._revealDirection(-1, 1);
              }
            },
            {
              text: "左上",
              onClick: () => {
                tile.content = null;
                this._revealDirection(-1, -1);
              }
            }
          ]
        );
     }
  }
// ── 祭坛事件扩展 ─────────────────────────────────────────────
  _handleAltarPray() {
    const hero = this.selectedHeroes[0];
    const healAmount = Math.floor(hero.maxHp * 0.4);
    hero.hp = Math.min(hero.maxHp, hero.hp + healAmount);
    this.ui.showEvent(
      "✨ Sacred Healing",
      `You feel blessed, +${healAmount} HP`,
      [
        {
          text: "Continue",
          onClick: () => {}
        }
      ]
    );
  }
// ── 灯塔事件扩展 ─────────────────────────────────────────────
 _revealDirection(dirQ, dirR) {
  const originQ = this.player.q;
  const originR = this.player.r;
  const radius = 6;   // 揭示距离
  for (let dq = -radius; dq <= radius; dq++) {
    for (let dr = -radius; dr <= radius; dr++) {
      const dist = Math.max(
        Math.abs(dq),
        Math.abs(dr),
        Math.abs(dq + dr)
      );
      if (dist > radius) continue;
      const q = originQ + dq;
      const r = originR + dr;
      const tile = this.map.getTile(q, r);
      if (!tile) continue;
      // 判断方向象限（X 型四分法）
      const inDirection =
        (dirQ ===  1 && dirR === -1 && dq > 0 && dr < 0) ||  // 右上
        (dirQ ===  1 && dirR ===  1 && dq > 0 && dr > 0) ||  // 右下
        (dirQ === -1 && dirR ===  1 && dq < 0 && dr > 0) ||  // 左下
        (dirQ === -1 && dirR === -1 && dq < 0 && dr < 0);    // 左上
      if (inDirection) {
        tile.isRevealed = true;
      }
    }
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