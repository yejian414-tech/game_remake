// src/utils/Pathfinder.js

/**
 * 六边形网格寻路工具
 *
 * 坐标系：轴坐标（axial coordinates），flat-top 布局
 * 六个方向邻格偏移：[1,0], [1,-1], [0,-1], [-1,0], [-1,1], [0,1]
 *
 * 通行规则：
 *   - moveCost = Infinity 的地形永远不可通行
 *   - 带有事件内容（tile.content != null）的格子：
 *       • 不能作为途经节点（路径不穿越它）
 *       • 可以作为寻路终点（玩家主动点击触发事件）
 *
 * 性能优化：
 *   - A* 和 Dijkstra 均使用 MinHeap 优先队列，时间复杂度 O(n log n)，
 *     替代原来每次出队都排序的 O(n² log n) 实现。
 */

const HEX_DIRS = [
  [1, 0], [1, -1], [0, -1],
  [-1, 0], [-1, 1], [0, 1],
];

// ── MinHeap（最小二叉堆）─────────────────────────────────────────
/**
 * 通用最小堆，按节点 .g 字段排序。
 * 相比 Array.sort，每次 push/pop 仅 O(log n)。
 */
class MinHeap {
  constructor() {
    this._data = [];
  }

  get size() { return this._data.length; }

  push(node) {
    this._data.push(node);
    this._bubbleUp(this._data.length - 1);
  }

  pop() {
    const top = this._data[0];
    const last = this._data.pop();
    if (this._data.length > 0) {
      this._data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this._data[parent].g <= this._data[i].g) break;
      this._swap(parent, i);
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this._data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this._data[l].g < this._data[smallest].g) smallest = l;
      if (r < n && this._data[r].g < this._data[smallest].g) smallest = r;
      if (smallest === i) break;
      this._swap(i, smallest);
      i = smallest;
    }
  }

  _swap(a, b) {
    const tmp = this._data[a];
    this._data[a] = this._data[b];
    this._data[b] = tmp;
  }
}

// ── 工具函数 ──────────────────────────────────────────────────────
const key = (q, r) => `${q},${r}`;

/** 六边形曼哈顿距离（cube 坐标等价） */
function hexDist(aq, ar, bq, br) {
  return Math.max(
    Math.abs(aq - bq),
    Math.abs(ar - br),
    Math.abs((aq + ar) - (bq + br)),
  );
}

/**
 * 判断格子是否可作为"途经节点"。
 * @param {object}  tile
 * @param {boolean} isGoal  该格是否就是寻路终点
 */
function isPassable(tile, isGoal = false) {
  if (!tile || !isFinite(tile.type.moveCost)) return false;
  if (tile.content != null && !isGoal) return false;
  return true;
}

// ── A* 寻路 ───────────────────────────────────────────────────────
/**
 * A* 寻路
 *
 * @param {import('../world/HexMap.js').HexMap} map
 * @param {number} startQ
 * @param {number} startR
 * @param {number} goalQ
 * @param {number} goalR
 * @param {number} [maxCost=Infinity]
 * @returns {{ path: Array<{q:number, r:number}>, cost: number } | null}
 *   path 包含目标但不含起点；不可达或超出移动力时返回 null
 */
export function findPath(map, startQ, startR, goalQ, goalR, maxCost = Infinity) {
  const goalTile = map.getTile(goalQ, goalR);
  if (!goalTile || !isFinite(goalTile.type.moveCost)) return null;

  const openSet = new MinHeap();
  const openMap = new Map();   // key → best g value（用于去重）
  const closedSet = new Set();

  const startNode = {
    q: startQ, r: startR,
    g: 0,
    f: hexDist(startQ, startR, goalQ, goalR),
    prev: null,
  };
  openSet.push(startNode);
  openMap.set(key(startQ, startR), 0);

  while (openSet.size > 0) {
    const current = openSet.pop();
    const cKey = key(current.q, current.r);

    if (closedSet.has(cKey)) continue;   // 堆中可能有旧节点，跳过
    closedSet.add(cKey);

    // 到达目标
    if (current.q === goalQ && current.r === goalR) {
      const path = [];
      let node = current;
      while (node.prev !== null) {
        path.unshift({ q: node.q, r: node.r });
        node = node.prev;
      }
      return { path, cost: current.g };
    }

    for (const [dq, dr] of HEX_DIRS) {
      const nq = current.q + dq;
      const nr = current.r + dr;
      const nKey = key(nq, nr);

      if (closedSet.has(nKey)) continue;

      const tile = map.getTile(nq, nr);
      const isGoal = (nq === goalQ && nr === goalR);

      if (!isPassable(tile, isGoal)) continue;

      const g = current.g + tile.type.moveCost;
      if (g > maxCost) continue;

      const existing = openMap.get(nKey);
      if (existing === undefined || g < existing) {
        openMap.set(nKey, g);
        openSet.push({
          q: nq, r: nr,
          g,
          f: g + hexDist(nq, nr, goalQ, goalR),
          prev: current,
        });
      }
    }
  }

  return null;   // 不可达
}

// ── Dijkstra 可达范围 ─────────────────────────────────────────────
/**
 * 获取当前移动力内所有可达格坐标（用于高亮显示可移动范围）。
 *
 * 规则与 findPath 相同：
 *   - 有 content 的格子出现在结果集（可作为目标），但不继续向外扩展。
 *
 * @param {import('../world/HexMap.js').HexMap} map
 * @param {number} startQ
 * @param {number} startR
 * @param {number} maxCost
 * @returns {Set<string>}  可达格的 "q,r" key 集合（含起点）
 */
export function getReachableTiles(map, startQ, startR, maxCost) {
  const dist = new Map();
  const heap = new MinHeap();
  const start = key(startQ, startR);

  dist.set(start, 0);
  heap.push({ q: startQ, r: startR, g: 0 });

  while (heap.size > 0) {
    const { q, r, g } = heap.pop();
    const curKey = key(q, r);

    // 已被更短路径更新则跳过（堆中可能残留旧节点）
    if (dist.get(curKey) < g) continue;

    // 有事件内容的格子：加入可达集合，但不从此继续扩展（终点语义）
    const curTile = map.getTile(q, r);
    const isStart = (q === startQ && r === startR);
    if (!isStart && curTile?.content != null) continue;

    for (const [dq, dr] of HEX_DIRS) {
      const nq = q + dq;
      const nr = r + dr;
      const nKey = key(nq, nr);

      const tile = map.getTile(nq, nr);
      if (!tile || !isFinite(tile.type.moveCost)) continue;

      const ng = g + tile.type.moveCost;
      if (ng > maxCost) continue;

      const prev = dist.get(nKey);
      if (prev === undefined || ng < prev) {
        dist.set(nKey, ng);
        heap.push({ q: nq, r: nr, g: ng });
      }
    }
  }

  return new Set(dist.keys());
}