// src/world/MapGenerator.js
// 地块生成器 —— 统一封装地形生成、屏障生成、事件放置逻辑

import {
  Tile, TileType, TileContentType,
  makeDungeon, makeBoss, makeTreasure,
  makeAltar, makeLighthouse, makeNPC,
} from './Tile.js';
import { HexMap } from './HexMap.js';

/**
 * MapGenerator
 *
 * 负责对一个已存在的 HexMap 实例执行所有生成步骤：
 *   1. generateTerrain  —— 填充地形 Tile（传入 rng，保证 variant 可复现）
 *   2. generateBarrier  —— 标记最外层为 BOUNDARY（由 generateTerrain 自动调用）
 *   3. generateEvents   —— 按概率放置随机事件内容
 *
 * 优化点：
 *  - 内圈保底 shuffle 改为无偏的 Fisher-Yates 算法。
 *  - Tile 构造时传入 rng，消除 Math.random() 非种子调用。
 *  - 使用 HexMap.setTile() 而非直接操作 map.tiles，兼容整数 key。
 */
export class MapGenerator {

  // ── 概率表（roll > threshold 则命中，从高到低依次匹配）──────────
  static ROLL_TABLE = [
    { threshold: 0.975, type: 'ALTAR' },
    { threshold: 0.950, type: 'DUNGEON' },
    { threshold: 0.910, type: 'TREASURE_EPIC' },
    { threshold: 0.900, type: 'TREASURE_RARE' },
    { threshold: 0.880, type: 'TREASURE_COMMON' },
    { threshold: 0.850, type: 'LIGHTHOUSE' },
  ];

  // 内圈必出的事件类型（顺序即优先级）
  static GUARANTEED_EVENTS = ['ALTAR', 'DUNGEON', 'TREASURE_COMMON', 'LIGHTHOUSE'];

  /**
   * @param {SeededRandom} rng - 与 HexMap 共享同一实例，保证种子一致性
   */
  constructor(rng) {
    this.rng = rng;
  }

  // ── 1. 地形生成 ───────────────────────────────────────────────────
  generateTerrain(map) {
    const { radius, rng } = map;
    for (let q = -radius; q <= radius; q++) {
      const r1 = Math.max(-radius, -q - radius);
      const r2 = Math.min(radius, -q + radius);
      for (let r = r1; r <= r2; r++) {
        let type = TileType.GRASS;
        const roll = this.rng.next();
        if (roll > 0.90) type = TileType.MOUNTAIN;
        else if (roll > 0.82) type = TileType.FOREST;

        // 传入 rng 保证 variant 随种子确定，地图可复现
        const tile = new Tile(q, r, type, this.rng);
        map.setTile(q, r, tile);
      }
    }
    this.generateBarrier(map);
  }

  // ── 2. 屏障生成 ───────────────────────────────────────────────────
  generateBarrier(map) {
    for (const tile of map.tiles.values()) {
      const dist = Math.max(Math.abs(tile.q), Math.abs(tile.r), Math.abs(tile.q + tile.r));
      if (dist === map.radius) {
        tile.type = TileType.BOUNDARY;
        tile.isRevealed = true;
      }
    }
  }

  // ── 3. 事件生成 ───────────────────────────────────────────────────
  generateEvents(map) {
    const origin = { q: -map.radius, r: map.radius };
    const generatedTypes = new Set();

    // 3a. 收集内圈 Tile，用无偏 Fisher-Yates 洗牌后保底生成
    const internalTiles = this._collectInternalTiles(map, origin, 4);
    MapGenerator.shuffle(internalTiles, this.rng);

    MapGenerator.GUARANTEED_EVENTS.forEach((eventType, i) => {
      const tile = internalTiles[i];
      if (tile && !tile.content) {
        tile.content = MapGenerator.createContent(eventType);
        generatedTypes.add(MapGenerator.getDedupeKey(tile.content));
      }
    });

    // 3b. 全图随机生成
    for (const tile of map.tiles.values()) {
      if (this._skipTile(tile)) continue;

      const dist = this._distFromOrigin(tile, origin);
      const isInside = dist <= 4;
      const eventType = MapGenerator.rollEventType(this.rng.next());
      if (!eventType) continue;

      // 内圈同类去重
      if (isInside) {
        const key = MapGenerator.getDedupeKey(MapGenerator.createContent(eventType));
        if (generatedTypes.has(key)) continue;
        generatedTypes.add(key);
      }

      tile.content = MapGenerator.createContent(eventType);
    }
  }

  // ── 静态工具：无偏 Fisher-Yates 洗牌 ────────────────────────────
  /**
   * 原地洗牌（Fisher-Yates），使用种子 rng，结果无偏。
   * 替代原有的 .sort(() => rng.next() - 0.5)（有偏，不均匀）。
   *
   * @template T
   * @param {T[]} arr
   * @param {SeededRandom} rng
   * @returns {T[]}  原数组（已就地洗牌）
   */
  static shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  // ── 静态工具：概率 → 事件类型 ──────────────────────────────────
  static rollEventType(roll) {
    for (const entry of MapGenerator.ROLL_TABLE) {
      if (roll > entry.threshold) return entry.type;
    }
    return null;
  }

  // ── 静态工具：事件类型 → 内容对象 ──────────────────────────────
  static createContent(eventType) {
    switch (eventType) {
      case 'ALTAR': return makeAltar(1);
      case 'DUNGEON': return makeDungeon('Dungeon', 1);
      case 'TREASURE_EPIC': return makeTreasure(3);
      case 'TREASURE_RARE': return makeTreasure(2);
      case 'TREASURE_COMMON': return makeTreasure(1);
      case 'LIGHTHOUSE': return makeLighthouse(1);
      case 'NPC': return makeNPC('Villager', 'Welcome, traveler!');
      default: return null;
    }
  }

  // ── 静态工具：内容对象 → 去重键 ────────────────────────────────
  static getDedupeKey(content) {
    if (!content) return null;
    return content.type === TileContentType.TREASURE ? 'treasure' : content.type;
  }

  // ── 私有：收集内圈可用 Tile ────────────────────────────────────
  _collectInternalTiles(map, origin, maxDist) {
    const result = [];
    for (const tile of map.tiles.values()) {
      if (this._skipTile(tile)) continue;
      if (this._distFromOrigin(tile, origin) <= maxDist) result.push(tile);
    }
    return result;
  }

  /** 不应放置事件的格子 */
  _skipTile(tile) {
    return tile.content !== null ||
      tile.type.moveCost === Infinity ||
      tile.type === TileType.BOUNDARY;
  }

  /** 六边形轴坐标曼哈顿距离 */
  _distFromOrigin(tile, origin) {
    return Math.max(
      Math.abs(tile.q - origin.q),
      Math.abs(tile.r - origin.r),
      Math.abs((tile.q + tile.r) - (origin.q + origin.r)),
    );
  }
}