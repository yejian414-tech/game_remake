// game_remake/src/world/HexMap.js
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

  generateMap() {
    for (let q = -this.radius; q <= this.radius; q++) {
      let r1 = Math.max(-this.radius, -q - this.radius);
      let r2 = Math.min(this.radius, -q + this.radius);
      for (let r = r1; r <= r2; r++) {
        let type = TileType.GRASS;
        if (this.rng.next() > 0.95) type = TileType.MOUNTAIN;
        else if (this.rng.next() > 0.8) type = TileType.FOREST;

        const tile = new Tile(q, r, type);
        // 15% 概率生成敌人 (红色红点)
        if ((q !== 0 || r !== 0) && this.rng.next() > 0.85) {
          tile.content = { type: 'enemy', name: '森林哥布林' };
        }
        this.tiles.set(`${q},${r}`, tile);
      }
    }
  }

  getTile(q, r) { return this.tiles.get(`${q},${r}`); }

  pixelToHex(x, y) {
    const q = (2/3 * x) / this.tileSize;
    const r = (-1/3 * x + Math.sqrt(3)/3 * y) / this.tileSize;
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