// src/rendering/Renderer.js
import { DataLoader } from '../data/DataLoader.js';
import { hexToPixel } from '../world/Tile.js';

export class Renderer {
  static debugMode = false;

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} camera
   * @param {import('../world/HexMap.js').HexMap} map
   * @param {import('../entities/Player.js').Player} player
   * @param {Set<string>|null} [rangeHighlight]  可达格的 "q,r" key 集合
   */
  static renderExploration(ctx, camera, map, player, rangeHighlight = null) {
    // 1. 清理背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const bgImg = DataLoader.getImage('background');
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    // 2. 绘制瓦片地图
    map.draw(ctx, camera, this.debugMode);

    // 3. 绘制可移动范围红线轮廓
    if (rangeHighlight && rangeHighlight.size > 0) {
      Renderer.drawRangeBorder(ctx, camera, map, rangeHighlight);
    }

    // 4. 绘制玩家角色
    ctx.save();
    ctx.translate(Math.round(camera.x), Math.round(camera.y));
    ctx.scale(camera.zoom ?? 1, camera.zoom ?? 1);
    player.draw(ctx, map.tileSize);
    ctx.restore();
  }

  static renderCombat(ctx, heroes, combatManager) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (combatManager?.enemies[0]?.monsterType === 'boss') {
      ctx.fillStyle = 'rgba(80, 0, 0, 0.25)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    heroes.forEach((h, i) => {
      h.targetX = 250; h.targetY = 200 + i * 150;
      h.draw(ctx, 50); Renderer._drawHealthBar(ctx, h);
    });
    if (combatManager) {
      combatManager.enemies.forEach((e, i) => {
        e.targetX = ctx.canvas.width - 250; e.targetY = 200 + i * 150;
        e.draw(ctx, 50); Renderer._drawHealthBar(ctx, e);
      });
    }
  }

  static _drawHealthBar(ctx, unit) {
    const BAR_W = 80, BAR_H = 8;
    const x = unit.x - BAR_W / 2;
    const y = unit.y + 45;
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, BAR_W, BAR_H);
    const ratio = Math.max(0, unit.hp / unit.maxHp);
    ctx.fillStyle = unit.type === 'player' ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(x, y, BAR_W * ratio, BAR_H);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, BAR_W, BAR_H);
  }

  // ── 可移动范围红线轮廓 ────────────────────────────────────────────

  /**
   * 在可达格集合外边缘画一条（或多条）闭合红线轮廓，带呼吸灯效果。
   *
   * hexToPixel 使用的是 flat-top（平顶）布局：
   *   x = size * 3/2 * q
   *   y = size * (√3/2 * q + √3 * r)
   *
   * flat-top 六边形 6 个顶点（从右侧顺时针编号）：
   *   V0 ( 1,      0    )  右
   *   V1 ( 0.5,  +√3/2 )  右下
   *   V2 (-0.5,  +√3/2 )  左下
   *   V3 (-1,      0    )  左
   *   V4 (-0.5,  -√3/2 )  左上
   *   V5 ( 0.5,  -√3/2 )  右上
   *
   * 邻格方向 → 与该邻格共享边的两端点：
   *   [1, 0]  右      → V0-V1
   *   [1,-1]  右上    → V5-V0
   *   [0,-1]  左上    → V4-V5
   *   [-1,0]  左      → V3-V4
   *   [-1,1]  左下    → V2-V3
   *   [0, 1]  右下    → V1-V2
   */
  static drawRangeBorder(ctx, camera, map, reachableSet) {
    const size = map.tileSize;
    const zoom = camera.zoom ?? 1;
    const SQ3H = Math.sqrt(3) / 2;   // ≈ 0.866

    // flat-top 顶点偏移（相对格心，单位倍数，需乘 size）
    const VERTS = [
      [1, 0],  // 0 右
      [0.5, SQ3H],  // 1 右下
      [-0.5, SQ3H],  // 2 左下
      [-1, 0],  // 3 左
      [-0.5, -SQ3H],  // 4 左上
      [0.5, -SQ3H],  // 5 右上
    ];

    const HEX_DIRS = [
      [1, 0], [1, -1], [0, -1],
      [-1, 0], [-1, 1], [0, 1],
    ];

    // 邻格方向下标 d → 本格与该邻格共享边的两顶点下标
    const DIR_EDGE = [
      [0, 1],  // d=0  [1, 0]  右      → V0-V1
      [5, 0],  // d=1  [1,-1]  右上    → V5-V0
      [4, 5],  // d=2  [0,-1]  左上    → V4-V5
      [3, 4],  // d=3  [-1,0]  左      → V3-V4
      [2, 3],  // d=4  [-1,1]  左下    → V2-V3
      [1, 2],  // d=5  [0, 1]  右下    → V1-V2
    ];

    // ── Step 1：找出所有"外边"，建立顶点邻接图 ─────────────────────
    // 用"像素坐标 ×100 取整"做 key，消除浮点误差
    const PREC = 100;
    const vKey = (x, y) => `${Math.round(x * PREC)},${Math.round(y * PREC)}`;

    /** @type {Map<string, [number, number]>} vertKey → 像素坐标 */
    const coords = new Map();
    /** @type {Map<string, string[]>}         vertKey → 邻接 vertKey[] (最多 2 个) */
    const adj = new Map();

    const addEdge = (ax, ay, bx, by) => {
      const ka = vKey(ax, ay);
      const kb = vKey(bx, by);
      coords.set(ka, [ax, ay]);
      coords.set(kb, [bx, by]);
      if (!adj.has(ka)) adj.set(ka, []);
      if (!adj.has(kb)) adj.set(kb, []);
      if (!adj.get(ka).includes(kb)) adj.get(ka).push(kb);
      if (!adj.get(kb).includes(ka)) adj.get(kb).push(ka);
    };

    for (const cellKey of reachableSet) {
      const [q, r] = cellKey.split(',').map(Number);
      const { x: cx, y: cy } = hexToPixel(q, r, size);

      for (let d = 0; d < 6; d++) {
        const [dq, dr] = HEX_DIRS[d];
        if (!reachableSet.has(`${q + dq},${r + dr}`)) {
          const [vi, vj] = DIR_EDGE[d];
          addEdge(
            cx + VERTS[vi][0] * size, cy + VERTS[vi][1] * size,
            cx + VERTS[vj][0] * size, cy + VERTS[vj][1] * size,
          );
        }
      }
    }

    if (adj.size === 0) return;

    // ── Step 2：沿邻接图行走，收集所有闭合环 ────────────────────────
    const visited = new Set();
    /** @type {Array<Array<[number, number]>>} */
    const loops = [];

    for (const startKey of adj.keys()) {
      if (visited.has(startKey)) continue;

      const loop = [];
      let cur = startKey;
      let prev = null;

      for (let guard = 0; guard < 20000; guard++) {
        if (cur === startKey && loop.length > 0) break;  // 环闭合
        if (visited.has(cur)) break;
        visited.add(cur);
        loop.push(coords.get(cur));

        // 选非来路的下一个邻居
        const nbrs = adj.get(cur);
        let next = null;
        for (const nk of nbrs) {
          if (nk !== prev) { next = nk; break; }
        }
        if (!next) break;
        prev = cur;
        cur = next;
      }

      if (loop.length >= 2) loops.push(loop);
    }

    if (loops.length === 0) return;

    // ── Step 3：绘制（呼吸灯） ──────────────────────────────────────
    const pulse = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(Date.now() / 300));

    ctx.save();
    ctx.translate(Math.round(camera.x), Math.round(camera.y));
    ctx.scale(zoom, zoom);

    ctx.strokeStyle = `rgba(255, 55, 55, ${pulse})`;
    ctx.lineWidth = 2.5 / zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(255, 30, 30, 0.9)';
    ctx.shadowBlur = 10;

    for (const loop of loops) {
      ctx.beginPath();
      ctx.moveTo(loop[0][0], loop[0][1]);
      for (let i = 1; i < loop.length; i++) {
        ctx.lineTo(loop[i][0], loop[i][1]);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }
}