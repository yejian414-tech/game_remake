// 新手村地图工厂
import { MapConfig, MapPresets } from '../core/Constants.js';
import { EventTable } from '../data/EventTable.js';
import { SeededRandom } from '../utils/SeededRandom.js';
export function createMapByPreset(presetName) {
  const preset = MapPresets[presetName];
  if (!preset) throw new Error('地图预设未找到: ' + presetName);
  const map = new HexMap(preset.radius, preset.tileSize, SeededRandom.randomSeed());
  // 事件地形逻辑可根据preset.eventLogic扩展
  map.generateEvents();
  return map;
}
// src/world/HexMap.js
import { Tile, TileType } from './Tile.js';

export class HexMap {
  constructor(radius, tileSize = 30, seed = SeededRandom.randomSeed()) {
    this.radius = radius;
    this.tileSize = tileSize;
    this.rng = new SeededRandom(seed);
    this.tiles = new Map();
    this.generateMap();
  }

  generateMap() {
    for (let q = -this.radius; q <= this.radius; q++) {
      const r1 = Math.max(-this.radius, -q - this.radius);
      const r2 = Math.min(this.radius, -q + this.radius);
      for (let r = r1; r <= r2; r++) {
        let type = TileType.GRASS;
        const roll = this.rng.next();
        if (roll > 0.90) type = TileType.MOUNTAIN;
        else if (roll > 0.82) type = TileType.FOREST;
        this.tiles.set(`${q},${r}`, new Tile(q, r, type));
      }
    }
    this.generateBarrier();
  }


  getTile(q, r) { return this.tiles.get(`${q},${r}`); }

  generateBarrier() {
    // 将真正的最外层瓷砖设为boundary并标记为已揭示
    for (const tile of this.tiles.values()) {
      const dist = Math.max(Math.abs(tile.q), Math.abs(tile.r), Math.abs(tile.q + tile.r));
      if (dist === this.radius) {
        tile.type = TileType.BOUNDARY;
        tile.isRevealed = true;
      }
    }
  }

  // ── 揭示周围一圈 ─────────────────────────────────────────
  revealAround(q, r, revealRadius = 1) {
    for (let dq = -revealRadius; dq <= revealRadius; dq++) {
      for (let dr = -revealRadius; dr <= revealRadius; dr++) {
        if (Math.abs(dq + dr) > revealRadius) continue;
        const tile = this.getTile(q + dq, r + dr);
        if (tile && !tile.isRevealed) tile.isRevealed = true;
      }
    }
  }

  /**
   * 放置事件内容，并自动揭示该格 + 周围一圈战争迷雾。
   * 所有往 tile 上写 content 的地方都应改用此方法。
   *
   * @param {number} q
   * @param {number} r
   * @param {object} content   makeDungeon / makeBoss / makeTreasure 的返回值
   * @param {number} [revealRadius=1]  同时揭示的半径，默认揭示自身 + 周围一圈
   */
  placeContent(q, r, content, revealRadius = 2) {
    const tile = this.getTile(q, r);
    if (!tile) return;
    tile.content = content;
    this.revealAround(q, r, revealRadius);
  }

  pixelToHex(x, y) {
    const q = (2 / 3 * x) / this.tileSize;
    const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / this.tileSize;
    return this.hexRound(q, r);
  }

  hexRound(q, r) {
    let s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);
    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);
    if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
    else if (rDiff > sDiff) rr = -rq - rs;
    return { q: rq, r: rr };
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {Camera} camera
   * @param {number} playerQ   玩家当前格 q（用于计算当前视野）
   * @param {number} playerR   玩家当前格 r
   * @param {number} [sightRadius=2]  可见半径（格数）
   * @param {boolean} [debugMode=false]  是否显示坐标
   */
  draw(ctx, camera, playerQ, playerR, sightRadius = 4, debugMode = false) {
    ctx.save();
    ctx.translate(camera.x, camera.y);

    this.tiles.forEach(tile => {
      let visState;

      if (!tile.isRevealed) {
        visState = 'hidden';
      } else {
        // 六边形轴坐标距离
        const dist = Math.max(
          Math.abs(tile.q - playerQ),
          Math.abs(tile.r - playerR),
          Math.abs((tile.q + tile.r) - (playerQ + playerR))
        );
        visState = dist <= sightRadius ? 'visible' : 'explored';
      }

      tile.draw(ctx, this.tileSize, false, visState, debugMode);
    });

    ctx.restore();
  }

  generateEvents() {
    const q0 = -this.radius;
    const r0 = this.radius;
    const internalTiles = [];
    this.tiles.forEach(tile => {
      const dq = tile.q - q0;
      const dr = tile.r - r0;
      const ds = -dq - dr;
      const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
      if (dist <= 4 && tile.type.id !== 3) {
        internalTiles.push(tile);
      }
    });

    // 保证每种事件生成一次
    const eventTypes = [
      'ALTAR',
      'DUNGEON',
      'TREASURE_COMMON',
      'LIGHTHOUSE'
    ];

    const generatedTypes = new Set();

    // 随机选择4个不同的内部瓦片
    const shuffled = internalTiles.slice().sort(() => this.rng.next() - 0.5);
    for (let i = 0; i < Math.min(4, shuffled.length); i++) {
      if (!shuffled[i].content) {
        const content = EventTable.createContentByType(eventTypes[i]);
        shuffled[i].content = content;
        generatedTypes.add(EventTable.getContentDedupeKey(content));
      }
    }

    // 然后随机生成其他事件
    this.tiles.forEach(tile => {
      if (tile.type.id === 2 || tile.type.id === 3) return; // 山脉和屏障不生成事件
      if (tile.content) return; // 已有事件

      const dq = tile.q - q0;
      const dr = tile.r - r0;
      const ds = -dq - dr;
      const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
      const roll = this.rng.next();

      const location = dist > 4 ? 'OUTSIDE_BARRIER' : 'INSIDE_BARRIER';
      const eventType = EventTable.getEventTypeByRoll(roll, location);

      if (!eventType) return;

      // 屏障内部需要检查是否已生成过该类型
      if (location === 'INSIDE_BARRIER') {
        const dedupeKey = EventTable.getContentDedupeKey(EventTable.createContentByType(eventType));
        if (generatedTypes.has(dedupeKey)) return;
        generatedTypes.add(dedupeKey);
      }

      const content = EventTable.createContentByType(eventType);
      if (content) {
        tile.content = content;
      }
    });
  }
}