// src/world/HexMap.js
import { Tile, TileType } from './Tile.js';

export class HexMap {
  constructor(radius, tileSize = 30) {
    this.radius = radius; // 地图半径
    this.tileSize = tileSize;
    this.tiles = new Map(); // 使用 Map 存储，键为 "q,r" 字符串
    this.generateMap();
  }

  // 生成六边形大地图 (大六边形布局)
  generateMap() {
    for (let q = -this.radius; q <= this.radius; q++) {
      let r1 = Math.max(-this.radius, -q - this.radius);
      let r2 = Math.min(this.radius, -q + this.radius);
      for (let r = r1; r <= r2; r++) {
        // 随机地形生成逻辑
        let type = TileType.GRASS;
        const rand = Math.random();
        if (rand > 0.8) type = TileType.FOREST;
        else if (rand > 0.95) type = TileType.MOUNTAIN;

        this.setTile(q, r, new Tile(q, r, type));
      }
    }
  }

  setTile(q, r, tile) {
    this.tiles.set(`${q},${r}`, tile);
  }

  getTile(q, r) {
    return this.tiles.get(`${q},${r}`);
  }

  // 关键：将 Canvas 鼠标点击坐标转换为轴向坐标 q, r
  pixelToHex(x, y) {
    const q = (2 / 3 * x) / this.tileSize;
    const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / this.tileSize;
    return this.hexRound(q, r);
  }

  // 坐标舍入（处理浮点数误差）
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
    // 应用 Camera 偏移
    ctx.translate(camera.x, camera.y);

    this.tiles.forEach(tile => {
      const isSelected = selectedHex &&
        selectedHex.q === tile.q &&
        selectedHex.r === tile.r;
      tile.draw(ctx, this.tileSize, isSelected);
    });

    ctx.restore();
  }
}