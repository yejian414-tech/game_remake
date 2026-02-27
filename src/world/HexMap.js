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
   */
  draw(ctx, camera, playerQ, playerR, sightRadius = 4) {
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

      tile.draw(ctx, this.tileSize, false, visState);
    });

    ctx.restore();
  }
}