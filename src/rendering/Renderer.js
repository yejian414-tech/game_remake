// src/rendering/Renderer.js
export class Renderer {
  static renderExploration(ctx, camera, map, player) {
    Renderer._clearCanvas(ctx);
    map.draw(ctx, camera, player.q, player.r, 4);
    ctx.save();
    ctx.translate(camera.x, camera.y);
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

  static _clearCanvas(ctx) { ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); }

  static _drawHealthBar(ctx, unit) {
    const BAR_W = 80; const BAR_H = 8; const x = unit.x - BAR_W / 2; const y = unit.y + 45;
    ctx.fillStyle = '#333'; ctx.fillRect(x, y, BAR_W, BAR_H);
    const ratio = Math.max(0, unit.hp / unit.maxHp);
    ctx.fillStyle = unit.type === 'player' ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(x, y, BAR_W * ratio, BAR_H);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, BAR_W, BAR_H);
  }
}