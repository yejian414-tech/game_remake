// src/world/HexMap.js
import { Tile, TileType } from './Tile.js';
import { SeededRandom } from '../utils/SeededRandom.js';  // ← 新增

export class HexMap {
  constructor(radius, tileSize = 30, seed = SeededRandom.randomSeed()) {  // ← 新增 seed 参数
    this.radius = radius;
    this.tileSize = tileSize;
    this.seed = seed;                    // ← 新增
    this.rng = new SeededRandom(seed);   // ← 新增
    this.tiles = new Map();

    console.log(`[HexMap] seed: ${seed}`);
    this.generateMap();
  }

  generateMap() {
    for (let q = -this.radius; q <= this.radius; q++) {
      let r1 = Math.max(-this.radius, -q - this.radius);
      let r2 = Math.min(this.radius, -q + this.radius);
      for (let r = r1; r <= r2; r++) {
        let type = TileType.GRASS;
        const rand = this.rng.next();    // ← 原来是 Math.random()，改为 this.rng.next()
        if (rand > 0.95) type = TileType.MOUNTAIN;
        else if (rand > 0.8) type = TileType.FOREST;

        this.setTile(q, r, new Tile(q, r, type));
      }
    }
  }

  // 以下代码保持不变 ↓
  setTile(q, r, tile) { this.tiles.set(`${q},${r}`, tile); }
  getTile(q, r) { return this.tiles.get(`${q},${r}`); }

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

  draw(ctx, camera, selectedHex = null) {
    ctx.save();
    ctx.translate(camera.x, camera.y);
    this.tiles.forEach(tile => {
      const isSelected = selectedHex && selectedHex.q === tile.q && selectedHex.r === tile.r;
      tile.draw(ctx, this.tileSize, isSelected);
    });
    ctx.restore();
  }
}