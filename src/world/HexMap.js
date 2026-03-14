// src/world/HexMap.js
import { Tile, TileType } from './Tile.js';
import { MapGenerator } from './MapGenerator.js';
import { MapPresets } from '../core/Constants.js';
import { SeededRandom } from '../utils/SeededRandom.js';
import { hexToPixel } from './Tile.js';

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
 *
 * 性能优化要点：
 *  1. tiles 的 key 改为整数，消除每次查询的字符串拼接和 GC。
 *  2. draw() 执行视口裁剪，仅绘制屏幕可见范围内的格子。
 *  3. worldBounds 预计算，供 Camera.setBounds 使用。
 */
export class HexMap {

  // key 编码偏移量，支持 radius ≤ 99 的地图
  static KEY_OFFSET = 100;
  static KEY_STRIDE = 200; // 2 * KEY_OFFSET

  constructor(radius, tileSize = 30, seed = SeededRandom.randomSeed()) {
    this.radius = radius;
    this.tileSize = tileSize;
    this.rng = new SeededRandom(seed);
    this.tiles = new Map();   // key: integer → Tile

    const gen = new MapGenerator(this.rng);
    gen.generateTerrain(this);
    gen.generateEvents(this);

    // 预计算世界边界（供相机边界钳位）
    this.worldBounds = this._computeWorldBounds();
  }

  // ── Key 编码 ───────────────────────────────────────────────────
  /** 将 (q, r) 轴坐标编码为单个整数 key，避免字符串分配。 */
  static encodeKey(q, r) {
    return (q + HexMap.KEY_OFFSET) * HexMap.KEY_STRIDE + (r + HexMap.KEY_OFFSET);
  }

  /** 整数 key 解码回 (q, r)（调试用）。 */
  static decodeKey(key) {
    const r = (key % HexMap.KEY_STRIDE) - HexMap.KEY_OFFSET;
    const q = Math.floor(key / HexMap.KEY_STRIDE) - HexMap.KEY_OFFSET;
    return { q, r };
  }

  // ── 查询 ───────────────────────────────────────────────────────
  getTile(q, r) {
    return this.tiles.get(HexMap.encodeKey(q, r));
  }

  setTile(q, r, tile) {
    this.tiles.set(HexMap.encodeKey(q, r), tile);
  }

  // ── 揭示周围格 ─────────────────────────────────────────────────
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
   */
  placeContent(q, r, content, revealRadius = 2) {
    const tile = this.getTile(q, r);
    if (!tile) return;
    tile.content = content;
    this.revealAround(q, r, revealRadius);
  }

  // ── 坐标转换 ───────────────────────────────────────────────────
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

  // ── 绘制（含视口裁剪）─────────────────────────────────────────
  /**
   * 绘制地图，仅渲染相机视口内可见的格子。
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Camera}  camera
   * @param {string|null} selectedKey  当前选中格的字符串 key（兼容旧格式 "q,r"）
   * @param {boolean} debugMode
   */
  draw(ctx, camera, selectedKey = null, debugMode = false) {
    const size = this.tileSize;
    const zoom = camera.zoom ?? 1;

    ctx.save();
    ctx.translate(Math.round(camera.x), Math.round(camera.y));
    ctx.scale(zoom, zoom);

    // ── 视口裁剪：求可见世界矩形，转换为 hex 范围 ──────────────
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;

    // 屏幕四角 → 世界坐标
    const wx0 = (0 - camera.x) / zoom;
    const wy0 = (0 - camera.y) / zoom;
    const wx1 = (cw - camera.x) / zoom;
    const wy1 = (ch - camera.y) / zoom;

    // 世界像素 → hex 坐标（粗估，各加 2 格缓冲防边缘裁切）
    // x = size * 1.5 * q  =>  q ≈ x / (size * 1.5)
    const MARGIN = 2;
    const qMin = Math.floor(wx0 / (size * 1.5)) - MARGIN;
    const qMax = Math.ceil(wx1 / (size * 1.5)) + MARGIN;

    // y = size * (√3/2 * q + √3 * r)  =>  r ≈ (y/size - √3/2 * q) / √3
    const SQ3 = Math.sqrt(3);
    const rMin = Math.floor((wy0 / size - SQ3 / 2 * qMax) / SQ3) - MARGIN;
    const rMax = Math.ceil((wy1 / size - SQ3 / 2 * qMin) / SQ3) + MARGIN;

    // ── 遍历可见范围，绘制对应 Tile ─────────────────────────────
    for (let q = qMin; q <= qMax; q++) {
      for (let r = rMin; r <= rMax; r++) {
        if (Math.abs(q) > this.radius ||
          Math.abs(r) > this.radius ||
          Math.abs(q + r) > this.radius) continue;

        const tile = this.getTile(q, r);
        if (!tile) continue;

        const isSelected = selectedKey === `${q},${r}`;
        const visState = this._visStateOf(tile);

        tile.draw(ctx, size, isSelected, visState, debugMode);
      }
    }

    ctx.restore();
  }

  // ── 辅助：计算单个格子的可见状态 ──────────────────────────────
  _visStateOf(tile) {
    if (!tile.isRevealed) return 'hidden';
    return 'visible';   // 若需"已探索但视野外"，在此扩展 fog-of-war 逻辑
  }

  // ── 辅助：预计算整张地图的世界像素边界 ────────────────────────
  _computeWorldBounds() {
    const size = this.tileSize;
    const r = this.radius;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let q = -r; q <= r; q++) {
      const r1 = Math.max(-r, -q - r);
      const r2 = Math.min(r, -q + r);
      for (let ri = r1; ri <= r2; ri++) {
        const { x, y } = hexToPixel(q, ri, size);
        if (x - size < minX) minX = x - size;
        if (y - size < minY) minY = y - size;
        if (x + size > maxX) maxX = x + size;
        if (y + size > maxY) maxY = y + size;
      }
    }
    return { minX, minY, maxX, maxY };
  }
}