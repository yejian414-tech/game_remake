// src/rendering/Renderer.js

/**
 * Renderer — 负责所有 Canvas 绘制，与游戏逻辑完全解耦。
 *
 * 只依赖：ctx、camera、以及传入的数据快照（不持有对 GameController 的引用）。
 */
export class Renderer {
  // ── 顶层入口 ─────────────────────────────────────────────

  /**
   * 地图探索场景渲染
   * @param {CanvasRenderingContext2D} ctx
   * @param {Camera}   camera
   * @param {HexMap}   map
   * @param {Player}   player
   */
  static renderExploration(ctx, camera, map, player) {
    Renderer._clearCanvas(ctx);
    map.draw(ctx, camera, player.q, player.r, 4);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    player.draw(ctx, map.tileSize);
    ctx.restore();
  }

  /**
   * 战斗场景渲染
   * @param {CanvasRenderingContext2D} ctx
   * @param {Player[]} heroes
   * @param {CombatManager|null} combatManager
   */
  static renderCombat(ctx, heroes, combatManager) {
    // 背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Boss 战血色叠层
    const isBoss = combatManager?.enemies[0]?.monsterType === 'boss';
    if (isBoss) {
      ctx.fillStyle = 'rgba(80, 0, 0, 0.25)';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    // 英雄
    heroes.forEach((h, i) => {
      h.targetX = 250;
      h.targetY = 200 + i * 150;
      h.draw(ctx, 50);
      Renderer._drawHealthBar(ctx, h);
    });

    // 敌人
    if (combatManager) {
      combatManager.enemies.forEach((e, i) => {
        e.targetX = ctx.canvas.width - 250;
        e.targetY = 200 + i * 150;
        e.draw(ctx, 50);
        Renderer._drawHealthBar(ctx, e);
      });
    }
  }

  // ── 内部工具 ─────────────────────────────────────────────

  static _clearCanvas(ctx) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  /**
   * 绘制角色血条
   * @param {CanvasRenderingContext2D} ctx
   * @param {Character} unit
   */
  static _drawHealthBar(ctx, unit) {
    const BAR_W = 80;
    const BAR_H = 8;
    const x = unit.x - BAR_W / 2;
    const y = unit.y + 45;

    // 背景轨道
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, BAR_W, BAR_H);

    // 血量填充
    const ratio = Math.max(0, unit.hp / unit.maxHp);
    ctx.fillStyle = unit.type === 'player' ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(x, y, BAR_W * ratio, BAR_H);

    // 边框
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, BAR_W, BAR_H);
  }
}