// src/utils/Pathfinder.js

/**
 * 六边形网格 A* 寻路工具
 *
 * 坐标系：轴坐标（axial coordinates）
 * 六个方向邻格偏移（pointy-top hex）：
 *   [1,0], [1,-1], [0,-1], [-1,0], [-1,1], [0,1]
 *
 * 通行规则：
 *   - moveCost = Infinity 的地形（森林、山脉、屏障）永远不可通行
 *   - 带有事件内容（tile.content != null）的格子视为"阻塞点"：
 *       • 不能作为途经节点（路径不穿越它）
 *       • 可以作为寻路的终点目标（玩家主动点击它时触发事件）
 */

const HEX_DIRS = [
  [1, 0], [1, -1], [0, -1],
  [-1, 0], [-1, 1], [0, 1],
];

/**
 * 六边形曼哈顿距离（cube 坐标下等价）
 */
function hexDist(aq, ar, bq, br) {
  return Math.max(
    Math.abs(aq - bq),
    Math.abs(ar - br),
    Math.abs((aq + ar) - (bq + br)),
  );
}

/**
 * 判断某个格子是否可以作为"途经节点"（中途经过）。
 *
 * 规则：
 *   1. 地形必须可通行（moveCost 有限）
 *   2. 格子上不能有事件内容（有内容的格子只作终点，路径绕行）
 *
 * goalQ/goalR 传入是为了允许目标格即使有 content 也能进入。
 *
 * @param {object} tile
 * @param {boolean} isGoal  该格是否就是寻路终点
 * @returns {boolean}
 */
function isPassable(tile, isGoal = false) {
  if (!tile || !isFinite(tile.type.moveCost)) return false;
  // 有事件内容的格子：只有作为目的地才允许进入，途经时跳过
  if (tile.content != null && !isGoal) return false;
  return true;
}

/**
 * A* 寻路
 *
 * @param {import('../world/HexMap.js').HexMap} map    当前地图
 * @param {number} startQ                              起始 q
 * @param {number} startR                              起始 r
 * @param {number} goalQ                               目标 q
 * @param {number} goalR                               目标 r
 * @param {number} [maxCost=Infinity]                  最大移动力上限（超过则截断）
 * @returns {{ path: Array<{q:number, r:number}>, cost: number } | null}
 *   path 包含目标但不含起点；不可达或超出移动力时返回 null
 */
export function findPath(map, startQ, startR, goalQ, goalR, maxCost = Infinity) {
  const key = (q, r) => `${q},${r}`;

  // 目标格必须地形可通行（content 无所谓，允许有事件的格子作为目标）
  const goalTile = map.getTile(goalQ, goalR);
  if (!goalTile || !isFinite(goalTile.type.moveCost)) return null;

  // open set：key → node
  /** @type {Map<string, {q:number, r:number, g:number, f:number, prev:object|null}>} */
  const openSet = new Map();
  const closedSet = new Set();

  const startNode = {
    q: startQ, r: startR,
    g: 0,
    f: hexDist(startQ, startR, goalQ, goalR),
    prev: null,
  };
  openSet.set(key(startQ, startR), startNode);

  while (openSet.size > 0) {
    // 取 f 值最小的节点
    let current = null;
    for (const node of openSet.values()) {
      if (!current || node.f < current.f) current = node;
    }

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

    openSet.delete(key(current.q, current.r));
    closedSet.add(key(current.q, current.r));

    for (const [dq, dr] of HEX_DIRS) {
      const nq = current.q + dq;
      const nr = current.r + dr;
      const nKey = key(nq, nr);

      if (closedSet.has(nKey)) continue;

      const tile = map.getTile(nq, nr);
      const isGoal = (nq === goalQ && nr === goalR);

      // 途经节点必须完全通行；目标节点只要地形可走即可
      if (!isPassable(tile, isGoal)) continue;

      const g = current.g + tile.type.moveCost;
      if (g > maxCost) continue;

      const existing = openSet.get(nKey);
      if (!existing || g < existing.g) {
        openSet.set(nKey, {
          q: nq, r: nr,
          g,
          f: g + hexDist(nq, nr, goalQ, goalR),
          prev: current,
        });
      }
    }
  }

  // 不可达
  return null;
}

/**
 * 获取当前移动力内所有可达格坐标（Dijkstra，用于高亮显示可移动范围）
 *
 * 同样遵循"有事件内容的格子不作途经点"规则：
 *   - 有 content 的格子会出现在结果集中（可以作为目标点击），
 *     但不会从它继续向外扩展路径。
 *
 * @param {import('../world/HexMap.js').HexMap} map
 * @param {number} startQ
 * @param {number} startR
 * @param {number} maxCost
 * @returns {Set<string>}  可达格的 "q,r" key 集合（含起点）
 */
export function getReachableTiles(map, startQ, startR, maxCost) {
  const key = (q, r) => `${q},${r}`;
  /** @type {Map<string, number>} key → 最低代价 */
  const dist = new Map();
  const queue = [{ q: startQ, r: startR, g: 0 }];
  dist.set(key(startQ, startR), 0);

  while (queue.length > 0) {
    // 简单优先队列：取 g 最小
    queue.sort((a, b) => a.g - b.g);
    const { q, r, g } = queue.shift();
    const curKey = key(q, r);

    // 已被更短路径更新则跳过
    if (dist.get(curKey) < g) continue;

    // 有事件内容的格子：加入可达集合，但不从此处继续扩展（终点语义）
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

      if (!dist.has(nKey) || ng < dist.get(nKey)) {
        dist.set(nKey, ng);
        queue.push({ q: nq, r: nr, g: ng });
      }
    }
  }

  return new Set(dist.keys());
}
