// src/world/HexMap.js
import { Tile, TileType } from './Tile.js';
import { MapGenerator } from './MapGenerator.js';
import { MapPresets } from '../core/Constants.js';
import { SeededRandom } from '../utils/SeededRandom.js';

// ── 地图工厂（按预设名创建）────────────────────────────────────────
export function createMapByPreset(presetName) {
  const preset = MapPresets[presetName];
  if (!preset) throw new Error('地图预设未找到: ' + presetName);
  return new HexMap(preset.radius, preset.tileSize, SeededRandom.randomSeed());
}

/**
 * HexMap
 *
 * 六边形地图的数据容器，只负责存储 Tile 和提供查询/操作接口。
 * 所有生成逻辑（地形、屏障、事件）均委托给 MapGenerator。
 */
export class HexMap {
  constructor(radius, tileSize = 30, seed = SeededRandom.randomSeed()) {
    this.radius = radius;
    this.tileSize = tileSize;
    this.rng = new SeededRandom(seed);
    this.tiles = new Map();

    // 委托 MapGenerator 完成所有生成步骤
    const gen = new MapGenerator(this.rng);
    gen.generateTerrain(this);
    gen.generateEvents(this);
  }

  // ── 查询 ───────────────────────────────────────────────────────────
  getTile(q, r) {
    return this.tiles.get(`${q},${r}`);
  }

  // ── 揭示周围一圈 ───────────────────────────────────────────────────
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
   * 放置事件内容，并自动揭示该格 + 周围几圈战争迷雾。
   * 所有往 tile 上写 content 的地方都应改用此方法。
   *
   * @param {number} q
   * @param {number} r
   * @param {object} content      makeDungeon / makeBoss / makeTreasure 的返回值
   * @param {number} [revealRadius=2]  同时揭示的半径，默认揭示自身 + 周围一圈
   */
  placeContent(q, r, content, revealRadius = 2) {
    const tile = this.getTile(q, r);
    if (!tile) return;
    tile.content = content;
    this.revealAround(q, r, revealRadius);
  }

  // ── 坐标转换 ───────────────────────────────────────────────────────
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

  // ── 绘制 ───────────────────────────────────────────────────────────
  /**
   * 绘制地图
   * @param {CanvasRenderingContext2D} ctx
   * @param {Camera} camera
   * @param {boolean} [debugMode=false]  是否显示坐标
   */
  draw(ctx, camera, debugMode = false) {
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom ?? 1, camera.zoom ?? 1);

    this.tiles.forEach(tile => {
      const visState = tile.isRevealed ? 'visible' : 'hidden';
      tile.draw(ctx, this.tileSize, false, visState, debugMode);
    });

    ctx.restore();
  }
}