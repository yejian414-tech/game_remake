// src/world/MapGenerator.js
// 地块生成器 —— 统一封装地形生成、屏障生成、事件放置逻辑

import {
  Tile, TileType, TileContentType,
  makeDungeon, makeBoss, makeTreasure,
  makeAltar, makeLighthouse, makeNPC
} from './Tile.js';

/**
 * MapGenerator
 *
 * 负责对一个已存在的 HexMap 实例执行所有生成步骤：
 *   1. generateTerrain  —— 填充地形 Tile
 *   2. generateBarrier  —— 标记最外层为 BOUNDARY（由 generateTerrain 自动调用）
 *   3. generateEvents   —— 按概率放置随机事件内容
 *
 * 外部调用示例：
 *   const gen = new MapGenerator(map.rng);
 *   gen.generateTerrain(map);
 *   gen.generateEvents(map);
 *
 * 静态工具方法可独立使用：
 *   MapGenerator.rollEventType(roll, zone)  → 事件类型字符串
 *   MapGenerator.createContent(eventType)   → tile.content 对象
 *   MapGenerator.getDedupeKey(content)      → 去重键字符串
 */
export class MapGenerator {

  // ── 概率表（从高到低依次匹配，roll > threshold 则命中）──────────
  static ROLL_TABLE = {
    OUTSIDE_BARRIER: [
      { threshold: 0.975, type: 'ALTAR' },
      { threshold: 0.950, type: 'DUNGEON' },
      { threshold: 0.910, type: 'TREASURE_EPIC' },
      { threshold: 0.900, type: 'TREASURE_RARE' },
      { threshold: 0.880, type: 'TREASURE_COMMON' },
      { threshold: 0.850, type: 'LIGHTHOUSE' },
    ],
    INSIDE_BARRIER: [
      { threshold: 0.975, type: 'ALTAR' },
      { threshold: 0.950, type: 'DUNGEON' },
      { threshold: 0.910, type: 'TREASURE_EPIC' },
      { threshold: 0.900, type: 'TREASURE_RARE' },
      { threshold: 0.880, type: 'TREASURE_COMMON' },
      { threshold: 0.850, type: 'LIGHTHOUSE' },
    ],
  };

  // 内圈必出的事件类型（顺序即优先级）
  static GUARANTEED_EVENTS = ['ALTAR', 'DUNGEON', 'TREASURE_COMMON', 'LIGHTHOUSE'];

  /**
   * @param {SeededRandom} rng - 随机数生成器（与 HexMap 共享同一实例以保证种子一致）
   */
  constructor(rng) {
    this.rng = rng;
  }

  // ── 1. 地形生成 ───────────────────────────────────────────────────
  /**
   * 在 map.tiles 中填充所有地形 Tile，完成后自动调用 generateBarrier。
   * @param {HexMap} map
   */
  generateTerrain(map) {
    const { radius } = map;
    for (let q = -radius; q <= radius; q++) {
      const r1 = Math.max(-radius, -q - radius);
      const r2 = Math.min(radius, -q + radius);
      for (let r = r1; r <= r2; r++) {
        let type = TileType.GRASS;
        const roll = this.rng.next();
        if (roll > 0.90)      type = TileType.MOUNTAIN;
        else if (roll > 0.82) type = TileType.FOREST;
        map.tiles.set(`${q},${r}`, new Tile(q, r, type));
      }
    }
    this.generateBarrier(map);
  }

  // ── 2. 屏障生成 ───────────────────────────────────────────────────
  /**
   * 将最外层 Tile 标记为 BOUNDARY 并设为已揭示。
   * @param {HexMap} map
   */
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
  /**
   * 在地图上放置随机事件内容：
   *   - 内圈（距参考原点 ≤ 4 格）保证 GUARANTEED_EVENTS 各出现一次
   *   - 其余地块按 ROLL_TABLE 概率随机生成，内圈同类去重
   * @param {HexMap} map
   */
  generateEvents(map) {
    const origin = { q: -map.radius, r: map.radius };
    const generatedTypes = new Set();

    // 3a. 内圈保底生成
    const internalTiles = this._collectInternalTiles(map, origin, 4);
    const shuffled = internalTiles.slice().sort(() => this.rng.next() - 0.5);

    MapGenerator.GUARANTEED_EVENTS.forEach((eventType, i) => {
      const tile = shuffled[i];
      if (tile && !tile.content) {
        tile.content = MapGenerator.createContent(eventType);
        generatedTypes.add(MapGenerator.getDedupeKey(tile.content));
      }
    });

    // 3b. 全图随机生成
    for (const tile of map.tiles.values()) {
      if (this._skipTile(tile)) continue;

      const dist = this._distFromOrigin(tile, origin);
      const zone = dist > 4 ? 'OUTSIDE_BARRIER' : 'INSIDE_BARRIER';
      const eventType = MapGenerator.rollEventType(this.rng.next(), zone);
      if (!eventType) continue;

      // 内圈同类去重
      if (zone === 'INSIDE_BARRIER') {
        const key = MapGenerator.getDedupeKey(MapGenerator.createContent(eventType));
        if (generatedTypes.has(key)) continue;
        generatedTypes.add(key);
      }

      tile.content = MapGenerator.createContent(eventType);
    }
  }

  // ── 静态工具：概率 → 事件类型 ──────────────────────────────────
  /**
   * 根据 roll 值和区域，返回对应事件类型字符串，没有匹配则返回 null。
   * @param {number} roll   0~1 随机数
   * @param {string} zone   'INSIDE_BARRIER' | 'OUTSIDE_BARRIER'
   * @returns {string|null}
   */
  static rollEventType(roll, zone = 'OUTSIDE_BARRIER') {
    const table = MapGenerator.ROLL_TABLE[zone] ?? MapGenerator.ROLL_TABLE.OUTSIDE_BARRIER;
    for (const entry of table) {
      if (roll > entry.threshold) return entry.type;
    }
    return null;
  }

  // ── 静态工具：事件类型 → 内容对象 ──────────────────────────────
  /**
   * 根据事件类型字符串，返回对应的内容对象（tile.content 格式）。
   * @param {string} eventType
   * @returns {Object|null}
   */
  static createContent(eventType) {
    switch (eventType) {
      case 'ALTAR':           return makeAltar(1);
      case 'DUNGEON':         return makeDungeon('Dungeon', 1);
      case 'TREASURE_EPIC':   return makeTreasure(3);
      case 'TREASURE_RARE':   return makeTreasure(2);
      case 'TREASURE_COMMON': return makeTreasure(1);
      case 'LIGHTHOUSE':      return makeLighthouse(1);
      case 'NPC':             return makeNPC('Villager', 'Welcome, traveler!');
      default:                return null;
    }
  }

  // ── 静态工具：内容对象 → 去重键 ────────────────────────────────
  /**
   * 所有品质的宝藏视为同一类，其余直接用 content.type。
   * @param {Object|null} content
   * @returns {string|null}
   */
  static getDedupeKey(content) {
    if (!content) return null;
    return content.type === TileContentType.TREASURE ? 'treasure' : content.type;
  }

  // ── 私有辅助 ────────────────────────────────────────────────────
  _collectInternalTiles(map, origin, maxDist) {
    const result = [];
    for (const tile of map.tiles.values()) {
      if (tile.type.id === 3) continue; // 跳过屏障
      if (this._distFromOrigin(tile, origin) <= maxDist) result.push(tile);
    }
    return result;
  }

  _distFromOrigin(tile, origin) {
    const dq = tile.q - origin.q;
    const dr = tile.r - origin.r;
    return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq - dr));
  }

  /** 山脉、屏障、已有内容的地块跳过随机事件放置 */
  _skipTile(tile) {
    return tile.type.id === 2    // MOUNTAIN
        || tile.type.id === 3    // BARRIER
        || tile.content != null;
  }
}
