
/**
 * 处理村庄事件
 * @param {Object} gameController - 游戏控制器
 * @param {Object} tile - 地块
 * @param {Object} content - 内容对象
 */
// ...existing code...
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

// 集中管理所有村庄配置
export const VILLAGE_LIST = [
  {
    map: 'main',
    q: -6,
    r: 2,
    name: '森林村庄'
  }
  // 后续可继续添加更多村庄
];

// 集中管理所有商人配置
export const MERCHANT_LIST = [
  {
    map: 'main',
    q: -2,
    r: -5,
    name: '旅商'
  },
  {
    map: 'main',
    q: 4,
    r: 0,
    name: '游商'
  }
  // 后续可继续添加更多商人
];

// 集中管理所有遗迹配置
export const RUIN_LIST = [
  {
    map: 'main',
    q: 6,
    r: 1,
    name: '古代遗迹入口',
    enemyName: '腐化守卫'
  }
  // 后续可继续添加更多遗迹
];

// 集中管理所有被腐化的鹿配置
export const CORRUPTED_DEER_LIST = [
  {
    map: 'main',
    q: 7,
    r: -7,
    name: '被腐化的鹿'
  },
  {
    map: 'main',
    q: -5,
    r: -2,
    name: '被腐化的鹿'
  }
  // 后续可继续添加更多被腐化的鹿
];
// src/data/EventTable.js
// 事件表管理 - 集中所有事件定义和生成概率

import { TileContentType, makeDungeon, makeBoss, makeTreasure, makeAltar, makeLighthouse, makeNPC, makeVillage, makeMerchant, makeRuin, makeCorruptedDeer } from '../world/Tile.js';
import { GameState } from '../core/Constants.js';
import { rollSpeed } from '../core/Dice.js';
import { rollRandomItem } from './items.js';

export class EventTable {
    /**
     * 处理村庄事件
     * @param {Object} gameController - 游戏控制器
     * @param {Object} tile - 地块
     * @param {Object} content - 内容对象
     */
    static handleVillage(gameController, tile, content) {
      gameController.ui.showEvent(
        '🏘️ 村庄',
        '欢迎来到村庄。',
        [
          {
            text: '贸易',
            onClick: () => { gameController.ui.showEvent('贸易', '（此处可实现交易界面）', [{ text: '返回', onClick: () => EventTable.handleVillage(gameController, tile, content) }]); }
          },
          {
            text: '任务',
            onClick: () => { 
              gameController.ui.showEvent(
                '📋 任务',
                '救援商队\n\n村长焦急地对你说：\n"冒险者，你来的正好。"\n"一支商队路过这里，他们的护卫在 村子东北方向 被怪物拖住了。"\n"如果他们死了，我们就彻底失去补给了。"',
                [
                  { 
                    text: '接取', 
                    onClick: () => { 
                      gameController._startMission('救援商队', 5);
                      gameController.ui.showEvent('✓ 任务已接取', '你已接取任务【救援商队】\n请前往村子东北方向救援商队护卫。\n\n回合限制: 5', [{ text: '返回', onClick: () => EventTable.handleVillage(gameController, tile, content) }]); 
                    } 
                  },
                  { 
                    text: '返回', 
                    onClick: () => EventTable.handleVillage(gameController, tile, content) 
                  }
                ]
              ); 
            }
          },
          {
            text: '休息',
            onClick: () => {
              const hero = gameController.selectedHeroes[0] || gameController.player;
              const heal = Math.floor(hero.maxHp * 0.2);
              hero.hp = Math.min(hero.maxHp, hero.hp + heal);
              gameController.ui.updatePartyStatus(gameController.selectedHeroes);
              gameController.ui.showEvent('休息', `你休息了一会，恢复了${heal}点生命值。`, [{ text: '返回', onClick: () => EventTable.handleVillage(gameController, tile, content) }]);
            }
          },
          {
            text: '离开',
            onClick: () => { }
          }
        ]
      );
    }

    /**
     * 处理商人事件 - 多步骤对话
     * @param {Object} gameController - 游戏控制器
     * @param {Object} tile - 地块
     * @param {Object} content - 内容对象
     */
    static handleMerchant(gameController, tile, content) {
      const merchant = content.name || '旅商';
      
      // 检查是否已经遇到过商人
      if (gameController.merchantEncountered) {
        // 再次遇到商人的对话 - 交易模式
        gameController.ui.showEvent(
          `👤 ${merchant}`,
          '"还没找到宝藏吗？"\n\n"如果你活着回来，我愿意用高价收购任何古代遗物。"',
          [
            {
              text: '贸易',
              onClick: () => {
                gameController.ui.showEvent(
                  `👤 ${merchant}`,
                  '（此处可实现交易界面）',
                  [{ text: '离开', onClick: () => { } }]
                );
              }
            },
            {
              text: '离开',
              onClick: () => { }
            }
          ]
        );
        return;
      }
      
      // 第一次遇到商人的对话 - 救援故事
      const step1 = () => {
        gameController.ui.showEvent(
          `👤 ${merchant}`,
          '"哦！感谢诸神！你就是那个救了我的护卫的人吗？"\n\n"这片森林已经疯了……树在腐烂，动物也变成了怪物。"\n\n"如果不是你，我们的货物早就被那些怪物抢光了。"',
          [{ text: '继续', onClick: step2 }]
        );
      };

      // 第二步对话
      const step2 = () => {
        gameController.ui.showEvent(
          `👤 ${merchant}`,
          '"几天前还不是这样。"\n\n"但突然之间，森林深处开始出现黑色的雾。"\n\n"所有靠近 古代遗迹 的生物都被腐化了。"',
          [{ text: '继续', onClick: step3 }]
        );
      };

      // 第三步对话
      const step3 = () => {
        gameController.ui.showEvent(
          `👤 ${merchant}`,
          '"不过……有一件事你可能会感兴趣。"\n\n"在遗迹深处，据说埋着一件 古老的宝藏。"\n\n"很多冒险者都是为了它来的。"\n\n"但很少有人活着回来。"',
          [{ text: '继续', onClick: step4 }]
        );
      };

      // 第四步对话
      const step4 = () => {
        gameController.ui.showEvent(
          `👤 ${merchant}`,
          '"如果你真的想找那宝藏。"\n\n"它大概在东边。"\n\n"你会看到一座 被藤蔓包围的遗迹入口。"\n\n"那就是一切麻烦的来源。"',
          [{ text: '继续', onClick: step5 }]
        );
      };

      // 第五步 - 结束
      const step5 = () => {
        gameController.merchantEncountered = true;
        gameController.ui.showEvent(
          `👤 ${merchant}`,
          '"拿着这些吧，算是感谢。"\n\n（商人递给你一个袋子）\n\n📢 提示：下次遇到商人可以进行交易。',
          [{ text: '离开', onClick: () => { gameController._startMission('🎯 寻找遗迹', 10); } }]
        );
      };

      // 开始第一步对话
      step1();
    }

    /**
     * 处理遗迹事件 - 古代遗迹入口
     * @param {Object} gameController - 游戏控制器
     * @param {Object} tile - 地块
     * @param {Object} content - 内容对象
     */
    static handleRuin(gameController, tile, content) {
      const ruinName = content.name || '古代遗迹入口';
      const enemyName = content.enemyName || '腐化守卫';

      gameController.ui.showEvent(
        `📍 ${ruinName}`,
        '巨大的石门矗立在森林中。\n\n门上刻着古老符文。\n\n突然，一个腐化的身影从阴影中走出来......',
        [
          {
            text: '⚔️ 战斗',
            onClick: () => {
              tile.content = null;
              // 创建一个小Boss敌人
              const bossContent = makeBoss(enemyName, 3, 'HARD');
              gameController.fsm.transition(GameState.COMBAT, bossContent);
            }
          },
          {
            text: '🏃 退避',
            onClick: () => {
              gameController.player.movementPoints = 0;
              gameController.ui.updateMovementUI(0);
            }
          }
        ]
      );
    }

    /**
     * 处理被腐化的鹿事件
     * @param {Object} gameController - 游戏控制器
     * @param {Object} tile - 地块
     * @param {Object} content - 内容对象
     */
    static handleCorruptedDeer(gameController, tile, content) {
      const deerName = content.name || '被腐化的鹿';

      gameController.ui.showEvent(
        `📍 森林`,
        '一只巨大的鹿站在森林中。\n\n它的身体被黑色藤蔓缠绕。\n\n它看起来很痛苦，眼神中闪烁着理性的光芒......',
        [
          {
            text: '⚔️ 攻击',
            onClick: () => {
              tile.content = null;
              // 创建一个普通敌人"腐化鹿"
              const combatContent = makeBoss(deerName, 2, 'NORMAL');
              combatContent.isRareReward = true; // 标记为稀有奖励
              gameController.fsm.transition(GameState.COMBAT, combatContent);
            }
          },
          {
            text: '🚶 放过它',
            onClick: () => {
              gameController.ui.showEvent(
                `📍 森林`,
                '你放低了武器。\n\n鹿似乎明白了你的意思，转身逃入了森林深处。\n\n本次事件结束。',
                [{ text: '继续', onClick: () => { } }]
              );
            }
          }
        ]
      );
    }
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
    VILLAGE: {
      id: 'village',
      title: '🏘️ 村庄',
      spawnChance: 0,
      description: '欢迎来到村庄。',
      tileContentType: 'village',
      handler: 'handleVillage'
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
