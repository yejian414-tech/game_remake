// src/world/HexMap.js
import { Tile, TileType } from './Tile.js';
import { SeededRandom } from '../utils/SeededRandom.js';

export class HexMap {
  constructor(radius, tileSize = 30, seed = SeededRandom.randomSeed()) {
    this.radius = radius;
    this.tileSize = tileSize;
    this.rng = new SeededRandom(seed);
    this.tiles = new Map();
    this.generateMap();
  }

  // 只生成地形，特殊内容由事件系统负责写入
  generateMap() {
    for (let q = -this.radius; q <= this.radius; q++) {
      const r1 = Math.max(-this.radius, -q - this.radius);
      const r2 = Math.min(this.radius, -q + this.radius);
      for (let r = r1; r <= r2; r++) {
        let type = TileType.GRASS;
        const roll = this.rng.next();
        if (roll > 0.96) type = TileType.MOUNTAIN;
        else if (roll > 0.82) type = TileType.FOREST;
        this.tiles.set(`${q},${r}`, new Tile(q, r, type));
      }
    }
  }

  getTile(q, r) { return this.tiles.get(`${q},${r}`); }

  // 将 (q,r) 为圆心、半径 revealRadius 格内的格子标记为已探索
  revealAround(q, r, revealRadius = 1) {
    for (let dq = -revealRadius; dq <= revealRadius; dq++) {
      for (let dr = -revealRadius; dr <= revealRadius; dr++) {
        if (Math.abs(dq + dr) > revealRadius) continue;
        const tile = this.getTile(q + dq, r + dr);
        if (tile && !tile.isRevealed) tile.isRevealed = true;
      }
    }
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

  draw(ctx, camera) {
    ctx.save();
    ctx.translate(camera.x, camera.y);
    this.tiles.forEach(tile => tile.draw(ctx, this.tileSize));
    ctx.restore();
  }
}