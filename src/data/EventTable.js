// 集中管理所有NPC配置
export const NPC_LIST = [
  {
    map: 'main',
    q: -8,
    r: 7,
    name: '受伤的村民',
    dialogue: '求求你……森林变了……树在流血……怪物从地里爬出来。\n请求您带我去北边的村庄。',
    iconType: 'redCircle' // 新增：图标类型
  }
  // 后续可继续添加更多NPC
];
// src/data/EventTable.js
// 事件表管理 - 集中所有事件定义和生成概率

import { TileContentType, makeDungeon, makeBoss, makeTreasure, makeAltar, makeLighthouse, makeNPC } from '../world/Tile.js';
import { GameState } from '../core/Constants.js';
import { rollSpeed } from '../core/Dice.js';
import { rollRandomItem } from './items.js';

export class EventTable {
  // 事件类型定义
  static EVENTS = {
    TRAP: {
      id: 'trap',
      title: '🪤 Trap',
      spawnChance: 0.15, // 15% 概率 - 冒险过程中触发
      description: 'You triggered a trap! Ready to roll...',
      handler: 'handleTrap'
    },
    DUNGEON: {
      id: 'dungeon',
      title: '⚔️ Enemy',
      spawnChance: 0,
      description: 'Found enemy, engage?',
      tileContentType: TileContentType.DUNGEON,
      handler: 'handleCombat'
    },
    BOSS: {
      id: 'boss',
      title: '⚠️ Boss',
      spawnChance: 0,
      description: 'Found boss, engage?',
      tileContentType: TileContentType.BOSS,
      handler: 'handleCombat'
    },
    TREASURE: {
      id: 'treasure',
      title: '🎁 Treasure',
      spawnChance: 0,
      description: 'Found treasure, open it?',
      tileContentType: TileContentType.TREASURE,
      handler: 'handleTreasure'
    },
    ALTAR: {
      id: 'altar',
      title: '🔮 Altar',
      spawnChance: 0,
      description: 'Pray?',
      tileContentType: TileContentType.ALTAR,
      handler: 'handleAltar'
    },
    LIGHTHOUSE: {
      id: 'lighthouse',
      title: '🗼 Lighthouse',
      spawnChance: 0,
      description: 'Look into the distance',
      tileContentType: TileContentType.LIGHTHOUSE,
      handler: 'handleLighthouse'
    },
    PORTAL: {
      id: 'portal',
      title: '🌀 传送阵',
      spawnChance: 0,
      description: 'Teleport?',
      tileContentType: TileContentType.PORTAL,
      handler: 'handlePortal'
    },
    NPC: {
      id: 'npc',
      title: '👤 Village NPC',
      spawnChance: 0,
      description: 'Talk to the villager',
      tileContentType: TileContentType.NPC,
      handler: 'handleNPC'
    }
  };

  // 地图生成概率配置
  static MAP_GENERATION_CHANCES = {
    OUTSIDE_BARRIER: {
      ALTAR: 0.025,        // roll > 0.975
      DUNGEON: 0.05,       // roll > 0.95
      TREASURE_EPIC: 0.09, // roll > 0.91
      TREASURE_RARE: 0.10, // roll > 0.90
      TREASURE_COMMON: 0.12, // roll > 0.88
      LIGHTHOUSE: 0.15     // roll > 0.85
    },
    INSIDE_BARRIER: {
      ALTAR: 0.025,        // roll > 0.975 且无重复
      DUNGEON: 0.05,       // roll > 0.95 且无重复
      TREASURE_EPIC: 0.09, // roll > 0.91 且无重复
      TREASURE_RARE: 0.10, // roll > 0.90 且无重复
      TREASURE_COMMON: 0.12, // roll > 0.88 且无重复
      LIGHTHOUSE: 0.15     // roll > 0.85 且无重复
    }
  };

  /**
   * 处理陷阱事件
   * @param {Object} gameController - 游戏控制器
   */
  static handleTrap(gameController) {
    gameController.ui.showEvent(
      this.EVENTS.TRAP.title,
      this.EVENTS.TRAP.description,
      [{
        text: "🎲 Roll",
        onClick: () => gameController._executeTrapRoll()
      }]
    );
  }

  /**
   * 处理陷阱掷骰结果
   * @param {Object} gameController - 游戏控制器
   * @param {number} rollValue - 掷骰结果 (1-6)
   */
  static handleTrapResult(gameController, rollValue) {
    gameController.ui.showEvent(
      "🎲 Roll Result",
      `You rolled a ${rollValue}!`,
      [{
        text: "Continue",
        onClick: () => {
          if (rollValue <= 3) {
            this.handleTrapDamage(gameController);
          } else {
            gameController.ui.showEvent("✨ Evaded", "You dodged the trap!", [{ text: "OK" }]);
          }
        }
      }]
    );
  }

  /**
   * 处理陷阱伤害
   * @param {Object} gameController - 游戏控制器
   */
  static handleTrapDamage(gameController) {
    const hero = gameController.selectedHeroes[0];
    const dmg = Math.floor(hero.maxHp * 0.15);
    hero.hp = Math.max(0, hero.hp - dmg);
    gameController.ui.updatePartyStatus(gameController.selectedHeroes);
    gameController.ui.showEvent("💥 Trap Sprung", `Took ${dmg} damage!`, [{ text: "OK" }]);
  }

  /**
   * 处理战斗事件
   * @param {Object} gameController - 游戏控制器
   * @param {Object} tile - 地块
   * @param {Object} content - 内容对象
   */
  static handleCombat(gameController, tile, content) {
    const isBoss = content.type === TileContentType.BOSS;
    gameController.ui.showEvent(
      isBoss ? this.EVENTS.BOSS.title : this.EVENTS.DUNGEON.title,
      `Found ${content.name}, engage?`,
      [
        {
          text: "⚔️ Fight",
          onClick: () => {
            tile.content = null;
            gameController.fsm.transition(GameState.COMBAT, content);
          }
        },
        {
          text: "🏃 Retreat",
          onClick: () => {
            gameController.player.movementPoints = 0;
            gameController.ui.updateMovementUI(0);
          }
        }
      ]
    );
  }

  /**
   * 处理宝藏事件
   * @param {Object} gameController - 游戏控制器
   * @param {Object} tile - 地块
   * @param {Object} content - 内容对象
   */
  static handleTreasure(gameController, tile, content) {
    gameController.ui.showEvent(
      this.EVENTS.TREASURE.title,
      `Found ${content.name}, open it?`,
      [{
        text: "🎁 Open",
        onClick: () => {
          tile.content = null;
          let loot = rollRandomItem();

          // 根据品质等级调整战利品
          if (content.lootTier === 3) {
            while (loot.rarity !== 'epic') loot = rollRandomItem();
          } else if (content.lootTier === 2) {
            while (loot.rarity === 'common') loot = rollRandomItem();
          }

          gameController.ui.showChestReward(loot, () => {
            gameController.ui.showLootAssign(loot, gameController.selectedHeroes, ({ heroIndex, action }) => {
              const hero = gameController.selectedHeroes?.[heroIndex];
              if (hero) {
                if (action === "put") {
                  hero.inventory.push(loot);
                } else {
                  hero.equip?.(loot, loot.slot ?? 0);
                }
                gameController.ui.updatePartyStatus(gameController.selectedHeroes);
              }
            });
          });
        }
      }]
    );
  }

  /**
   * 处理祭坛事件
   * @param {Object} gameController - 游戏控制器
   * @param {Object} tile - 地块
   */
  static handleAltar(gameController, tile) {
    gameController.ui.showEvent(
      this.EVENTS.ALTAR.title,
      this.EVENTS.ALTAR.description,
      [
        {
          text: "🙏 Pray",
          onClick: () => {
            tile.content = null;
            this.applyAltarHealing(gameController);
          }
        },
        {
          text: "🚶 Leave",
          onClick: () => { }
        }
      ]
    );
  }

  /**
   * 应用祭坛治疗
   * @param {Object} gameController - 游戏控制器
   */
  static applyAltarHealing(gameController) {
    const hero = gameController.selectedHeroes[0];
    const heal = Math.floor(hero.maxHp * 0.4);
    hero.hp = Math.min(hero.maxHp, hero.hp + heal);
    gameController.ui.updatePartyStatus(gameController.selectedHeroes);
    gameController.ui.showEvent("✨ Divine Light", `Healed ${heal} HP`, [{ text: "Continue", onClick: () => { } }]);
  }

  /**
   * 处理灯塔事件
   * @param {Object} gameController - 游戏控制器
   * @param {Object} tile - 地块
   */
  static handleLighthouse(gameController, tile) {
    gameController.ui.showEvent(
      this.EVENTS.LIGHTHOUSE.title,
      this.EVENTS.LIGHTHOUSE.description,
      [
        { text: "NE", onClick: () => { tile.content = null; gameController._revealDirection(1, -1); } },
        { text: "SE", onClick: () => { tile.content = null; gameController._revealDirection(1, 1); } },
        { text: "SW", onClick: () => { tile.content = null; gameController._revealDirection(-1, 1); } },
        { text: "NW", onClick: () => { tile.content = null; gameController._revealDirection(-1, -1); } }
      ]
    );
  }

  /**
   * 处理传送阵事件
   * @param {Object} gameController - 游戏控制器
   * @param {Object} tile - 地块
   * @param {Object} content - 内容对象
   */
  static handlePortal(gameController, tile, content) {
    gameController.ui.showEvent(
      this.EVENTS.PORTAL.title,
      `是否传送到${content.targetMap}？`,
      [
        {
          text: `传送到${content.targetMap}`,
          onClick: () => {
            tile.content = content;
            gameController._switchMap(content.targetMap, content.targetQ, content.targetR);
          }
        },
        {
          text: "取消",
          onClick: () => { }
        }
      ]
    );
  }

  /**
   * 处理 NPC 事件
   * @param {Object} gameController - 游戏控制器
   * @param {Object} tile - 地块
   * @param {Object} content - 内容对象 (NPC)
   */
  static handleNPC(gameController, tile, content) {
    gameController.ui.showEvent(
      `👤 ${content.name}`,
      content.dialogue || "Hello traveler!",
      [
        {
          text: "continue",
          onClick: () => { }
        }
      ]
    );
  }

  /**
   * 获取陷阱生成概率
   * @returns {number} 概率 (0-1)
   */
  static getTrapSpawnChance() {
    return this.EVENTS.TRAP.spawnChance;
  }

  /**
   * 获取地图生成概率
   * @param {string} location - 位置类型: 'INSIDE_BARRIER' 或 'OUTSIDE_BARRIER'
   * @returns {Object} 该位置的所有生成概率
   */
  static getMapGenerationChances(location = 'OUTSIDE_BARRIER') {
    return this.MAP_GENERATION_CHANCES[location] || this.MAP_GENERATION_CHANCES.OUTSIDE_BARRIER;
  }

  /**
   * 根据位置和骰子结果获取生成的事件类型
   * @param {number} roll - 随机数 (0-1)
   * @param {string} location - 位置类型
   * @returns {string} 事件类型 ('ALTAR', 'DUNGEON', etc.) 或 null
   */
  static getEventTypeByRoll(roll, location = 'OUTSIDE_BARRIER') {
    const chances = this.getMapGenerationChances(location);

    if (roll > 0.975) return 'ALTAR';
    if (roll > 0.95) return 'DUNGEON';
    if (roll > 0.91) return 'TREASURE_EPIC';
    if (roll > 0.90) return 'TREASURE_RARE';
    if (roll > 0.88) return 'TREASURE_COMMON';
    if (roll > 0.85) return 'LIGHTHOUSE';

    return null;
  }

  /**
   * 根据事件类型创建内容对象
   * @param {string} eventType - 事件类型 ('ALTAR', 'DUNGEON', 'TREASURE_EPIC', etc.)
   * @returns {Object} 内容对象 (makeDungeon/makeTreasure 等的返回值)
   */
  static createContentByType(eventType) {
    switch (eventType) {
      case 'ALTAR':
        return makeAltar(1);
      case 'DUNGEON':
        return makeDungeon('Dungeon', 1);
      case 'TREASURE_EPIC':
      case 'TREASURE_RARE':
      case 'TREASURE_COMMON':
        const tier = eventType === 'TREASURE_EPIC' ? 3 : (eventType === 'TREASURE_RARE' ? 2 : 1);
        return makeTreasure(tier);
      case 'LIGHTHOUSE':
        return makeLighthouse(1);
      case 'NPC':
        return makeNPC('Villager', 'Welcome, traveler!');
      default:
        return null;
    }
  }

  /**
   * 获取内容类型的唯一标识（用于去重）
   * @param {Object} content - 内容对象
   * @returns {string} 去重键
   */
  static getContentDedupeKey(content) {
    if (!content) return null;
    if (content.type === TileContentType.TREASURE) return 'treasure'; // 所有品质的宝藏都视为同一类型
    return content.type;
  }
}
