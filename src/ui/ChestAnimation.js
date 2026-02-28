// src/ui/ChestAnimation.js
// 使用 p5.js 实例模式绘制开宝箱动画 + 道具展示
// 外部调用：ChestAnimation.play(item, onClose)

import { RARITY_COLORS } from '../data/items.js';

/**
 * p5.js 开宝箱动画控制器
 *
 * 流程：
 *   1. 宝箱从画面底部弹入 + 轻微旋转
 *   2. 宝箱晃动 → 打开（箱盖翻转）
 *   3. 光柱爆发 + 粒子特效
 *   4. 道具图标浮出 + 名称/描述淡入
 *   5. 点击任意处关闭
 */
export class ChestAnimation {
  static _overlay = null;   // DOM 容器
  static _p5inst = null;    // p5 实例

  /**
   * 播放开宝箱动画
   * @param {object} item    道具对象（来自 items.js）
   * @param {function} onClose 关闭回调
   */
  static play(item, onClose) {
    // 防止重复
    if (ChestAnimation._p5inst) ChestAnimation.destroy();

    // ── 创建全屏遮罩 ───────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = 'chest-anim-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0',
      zIndex: '300', background: 'rgba(0,0,0,0)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      transition: 'background 0.6s ease',
    });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.style.background = 'rgba(0,0,0,0.75)');
    ChestAnimation._overlay = overlay;

    // ── 启动 p5 实例 ────────────────────────────────
    ChestAnimation._p5inst = new p5(sketch => {
      const W = Math.min(window.innerWidth, 800);
      const H = Math.min(window.innerHeight, 600);
      const cx = W / 2, cy = H / 2;

      // 动画阶段
      let phase = 'enter';   // enter → shake → open → reveal → idle
      let timer = 0;
      let particles = [];
      let lightRays = [];
      let canClose = false;

      // 宝箱状态
      let chestY = H + 100;
      let chestTargetY = cy + 40;
      let chestAngle = 0;
      let lidAngle = 0;       // 箱盖打开角度 0~PI/2
      let shakeOffset = 0;

      // 道具浮出
      let itemY = cy;
      let itemAlpha = 0;
      let textAlpha = 0;
      let glowPulse = 0;

      const rarityColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;

      sketch.setup = function () {
        const canvas = sketch.createCanvas(W, H);
        canvas.parent(overlay);
        canvas.style('border-radius', '12px');
        sketch.textAlign(sketch.CENTER, sketch.CENTER);
        sketch.imageMode(sketch.CENTER);
      };

      sketch.draw = function () {
        sketch.clear();
        timer += sketch.deltaTime / 1000;
        glowPulse += 0.05;

        // ── 阶段逻辑 ─────────────────────────────
        switch (phase) {
          case 'enter':
            chestY += (chestTargetY - chestY) * 0.08;
            chestAngle = Math.sin(timer * 3) * 0.03;
            if (Math.abs(chestY - chestTargetY) < 2) { phase = 'shake'; timer = 0; }
            break;

          case 'shake':
            shakeOffset = Math.sin(timer * 25) * (4 + timer * 6);
            chestAngle = Math.sin(timer * 20) * 0.04;
            if (timer > 1.2) { phase = 'open'; timer = 0; spawnBurstParticles(); }
            break;

          case 'open':
            lidAngle += (Math.PI * 0.45 - lidAngle) * 0.1;
            shakeOffset *= 0.9;
            itemY += (cy - 60 - itemY) * 0.06;
            itemAlpha = Math.min(255, itemAlpha + 8);
            if (timer > 0.3) spawnLightRays();
            if (timer > 1.5) { phase = 'reveal'; timer = 0; }
            break;

          case 'reveal':
            textAlpha = Math.min(255, textAlpha + 6);
            itemY += (cy - 80 - itemY) * 0.05;
            if (timer > 0.8) { phase = 'idle'; canClose = true; }
            break;

          case 'idle':
            // 等待点击
            break;
        }

        // ── 背景光效 ─────────────────────────────
        if (phase === 'open' || phase === 'reveal' || phase === 'idle') {
          drawLightBeam(sketch, cx, cy - 20, rarityColor.glow, glowPulse);
        }

        // ── 粒子 ────────────────────────────────
        updateAndDrawParticles(sketch, particles);
        updateAndDrawRays(sketch, lightRays);

        // ── 宝箱 ────────────────────────────────
        sketch.push();
        sketch.translate(cx + shakeOffset, chestY);
        sketch.rotate(chestAngle);
        drawChest(sketch, lidAngle, rarityColor.main);
        sketch.pop();

        // ── 道具图标 ────────────────────────────
        if (itemAlpha > 0) {
          sketch.push();
          sketch.translate(cx, itemY);

          // 光环
          const glowSize = 60 + Math.sin(glowPulse) * 8;
          const c = sketch.color(rarityColor.glow);
          c.setAlpha(itemAlpha * 0.3);
          sketch.noStroke();
          sketch.fill(c);
          sketch.ellipse(0, 0, glowSize * 2, glowSize * 2);

          drawItemIcon(sketch, item.icon, itemAlpha, rarityColor.main);
          sketch.pop();
        }

        // ── 文字 ─────────────────────────────────
        if (textAlpha > 0) {
          // 稀有度标签
          sketch.push();
          sketch.textSize(13);
          sketch.noStroke();
          const tagC = sketch.color(rarityColor.main);
          tagC.setAlpha(textAlpha);
          sketch.fill(tagC);
          sketch.text(`— ${rarityColor.label} —`, cx, itemY + 55);

          // 道具名
          sketch.textSize(26);
          sketch.textStyle(sketch.BOLD);
          const nameC = sketch.color(255);
          nameC.setAlpha(textAlpha);
          sketch.fill(nameC);
          sketch.text(item.name, cx, itemY + 85);

          // 道具描述
          sketch.textSize(14);
          sketch.textStyle(sketch.NORMAL);
          const descC = sketch.color(200);
          descC.setAlpha(textAlpha * 0.8);
          sketch.fill(descC);
          sketch.text(item.desc, cx, itemY + 115);

          // 关闭提示
          if (canClose) {
            const hintA = Math.floor(128 + Math.sin(glowPulse * 2) * 80);
            const hintC = sketch.color(180);
            hintC.setAlpha(hintA);
            sketch.fill(hintC);
            sketch.textSize(12);
            sketch.text('[ 点击任意处继续 ]', cx, H - 40);
          }
          sketch.pop();
        }

        // ── 持续生成小粒子 ──────────────────────
        if ((phase === 'open' || phase === 'reveal' || phase === 'idle') && sketch.frameCount % 3 === 0) {
          particles.push(makeSparkle(cx, chestY - 30, rarityColor.glow));
        }
      };

      sketch.mousePressed = function () {
        if (canClose) {
          ChestAnimation.destroy();
          if (onClose) onClose();
        }
      };

      // ── 粒子生成器 ────────────────────────────
      function spawnBurstParticles() {
        for (let i = 0; i < 30; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 5;
          particles.push({
            x: cx, y: chestTargetY - 20,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 1,
            decay: 0.015 + Math.random() * 0.02,
            size: 3 + Math.random() * 4,
            color: rarityColor.glow,
          });
        }
      }

      function spawnLightRays() {
        if (lightRays.length < 8 && Math.random() < 0.15) {
          lightRays.push({
            x: cx, y: chestTargetY - 25,
            angle: -Math.PI / 2 + (Math.random() - 0.5) * 1.2,
            length: 80 + Math.random() * 120,
            width: 2 + Math.random() * 3,
            life: 1, decay: 0.02,
            color: rarityColor.glow,
          });
        }
      }

      function makeSparkle(bx, by, color) {
        return {
          x: bx + (Math.random() - 0.5) * 60,
          y: by,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -1 - Math.random() * 2,
          life: 1,
          decay: 0.02 + Math.random() * 0.015,
          size: 2 + Math.random() * 3,
          color,
        };
      }

    }, overlay);
  }

  static destroy() {
    if (ChestAnimation._p5inst) {
      ChestAnimation._p5inst.remove();
      ChestAnimation._p5inst = null;
    }
    if (ChestAnimation._overlay) {
      ChestAnimation._overlay.remove();
      ChestAnimation._overlay = null;
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  绘制辅助函数（纯 p5 绘图）
// ══════════════════════════════════════════════════════════════

/** 绘制宝箱 */
function drawChest(s, lidAngle, accentColor) {
  const bw = 90, bh = 55;   // 箱体宽高
  const lh = 25;             // 箱盖高度

  // ── 箱体 ──
  s.push();
  // 阴影
  s.noStroke();
  s.fill(0, 0, 0, 60);
  s.ellipse(0, bh / 2 + 8, bw + 10, 16);

  // 箱身
  s.fill(90, 55, 25);
  s.stroke(60, 35, 15);
  s.strokeWeight(2);
  s.rect(-bw / 2, -bh / 2, bw, bh, 4);

  // 金属条纹
  s.stroke(180, 140, 60);
  s.strokeWeight(3);
  s.line(-bw / 2 + 8, -bh / 2, -bw / 2 + 8, bh / 2);
  s.line(bw / 2 - 8, -bh / 2, bw / 2 - 8, bh / 2);

  // 锁扣
  s.noStroke();
  s.fill(210, 170, 60);
  s.rect(-8, -8, 16, 16, 3);
  s.fill(170, 130, 40);
  s.ellipse(0, 0, 8, 8);

  // ── 箱盖（以箱体顶部为轴旋转）──
  s.push();
  s.translate(0, -bh / 2);
  s.rotate(-lidAngle);

  // 盖面
  s.fill(110, 70, 30);
  s.stroke(70, 45, 20);
  s.strokeWeight(2);
  s.rect(-bw / 2, -lh, bw, lh, 4, 4, 0, 0);

  // 盖上金属条
  s.stroke(200, 160, 60);
  s.strokeWeight(2);
  s.line(-bw / 2 + 8, -lh, -bw / 2 + 8, 0);
  s.line(bw / 2 - 8, -lh, bw / 2 - 8, 0);

  // 顶部弧形装饰
  s.noStroke();
  s.fill(200, 160, 60);
  s.arc(0, -lh, 30, 12, s.PI, 0);

  s.pop();

  // 发光边缘（开启后）
  if (lidAngle > 0.1) {
    const glowAlpha = Math.min(200, lidAngle * 300);
    const c = s.color(accentColor);
    c.setAlpha(glowAlpha);
    s.noStroke();
    s.fill(c);
    s.rect(-bw / 2 + 4, -bh / 2 - 4, bw - 8, 8, 4);
  }

  s.pop();
}

/** 绘制道具图标 */
function drawItemIcon(s, iconType, alpha, accentColor) {
  s.push();
  const a = alpha / 255;

  switch (iconType) {
    case 'shield':
      drawShieldIcon(s, a, accentColor);
      break;
    case 'sword':
      drawSwordIcon(s, a, accentColor);
      break;
    case 'potion':
      drawPotionIcon(s, a, accentColor);
      break;
    case 'boots':
      drawBootsIcon(s, a, accentColor);
      break;
    case 'clover':
      drawCloverIcon(s, a, accentColor);
      break;
    default:
      // 默认圆形
      s.fill(200, 200, 200, alpha);
      s.noStroke();
      s.ellipse(0, 0, 40, 40);
  }
  s.pop();
}

function drawShieldIcon(s, a, color) {
  s.push();
  s.scale(1.8);
  // 盾体
  s.fill(80, 120, 200, a * 255);
  s.stroke(200, 200, 255, a * 255);
  s.strokeWeight(2);
  s.beginShape();
  s.vertex(0, -20);
  s.vertex(18, -14);
  s.vertex(18, 4);
  s.vertex(0, 20);
  s.vertex(-18, 4);
  s.vertex(-18, -14);
  s.endShape(s.CLOSE);
  // 十字装饰
  s.stroke(255, 220, 100, a * 255);
  s.strokeWeight(3);
  s.line(0, -12, 0, 12);
  s.line(-10, -2, 10, -2);
  s.pop();
}

function drawSwordIcon(s, a, color) {
  s.push();
  s.scale(1.8);
  // 剑身
  s.stroke(220, 220, 240, a * 255);
  s.strokeWeight(4);
  s.line(0, -24, 0, 10);
  // 剑尖
  s.fill(240, 240, 255, a * 255);
  s.noStroke();
  s.triangle(-3, -24, 3, -24, 0, -30);
  // 护手
  s.stroke(180, 140, 50, a * 255);
  s.strokeWeight(3);
  s.line(-10, 10, 10, 10);
  // 剑柄
  s.stroke(120, 70, 30, a * 255);
  s.strokeWeight(4);
  s.line(0, 10, 0, 20);
  // 宝石
  s.noStroke();
  s.fill(200, 50, 50, a * 255);
  s.ellipse(0, 10, 6, 6);
  s.pop();
}

function drawPotionIcon(s, a, color) {
  s.push();
  s.scale(1.8);
  // 瓶身
  s.fill(200, 230, 255, a * 200);
  s.stroke(180, 210, 240, a * 255);
  s.strokeWeight(1.5);
  s.beginShape();
  s.vertex(-4, -10);
  s.vertex(-4, -6);
  s.vertex(-12, 4);
  s.vertex(-12, 14);
  s.bezierVertex(-12, 20, 12, 20, 12, 14);
  s.vertex(12, 4);
  s.vertex(4, -6);
  s.vertex(4, -10);
  s.endShape(s.CLOSE);
  // 液体
  s.noStroke();
  s.fill(100, 200, 255, a * 220);
  s.beginShape();
  s.vertex(-11, 6);
  s.vertex(-11, 14);
  s.bezierVertex(-11, 19, 11, 19, 11, 14);
  s.vertex(11, 6);
  s.endShape(s.CLOSE);
  // 瓶口
  s.fill(180, 160, 120, a * 255);
  s.noStroke();
  s.rect(-5, -14, 10, 5, 2);
  // 高光
  s.stroke(255, 255, 255, a * 120);
  s.strokeWeight(1.5);
  s.line(-6, -2, -8, 8);
  s.pop();
}

function drawBootsIcon(s, a, color) {
  s.push();
  s.scale(1.8);
  // 靴子轮廓
  s.fill(80, 60, 50, a * 255);
  s.stroke(120, 90, 60, a * 255);
  s.strokeWeight(1.5);
  // 左靴
  s.beginShape();
  s.vertex(-14, -15);
  s.vertex(-14, 8);
  s.vertex(-20, 12);
  s.vertex(-20, 16);
  s.vertex(-2, 16);
  s.vertex(-2, 8);
  s.vertex(-6, -15);
  s.endShape(s.CLOSE);
  // 右靴
  s.beginShape();
  s.vertex(2, -15);
  s.vertex(2, 8);
  s.vertex(2, 16);
  s.vertex(20, 16);
  s.vertex(20, 12);
  s.vertex(14, 8);
  s.vertex(6, -15);
  s.endShape(s.CLOSE);
  // 闪电纹
  s.stroke(255, 220, 50, a * 255);
  s.strokeWeight(2);
  s.noFill();
  s.beginShape();
  s.vertex(-12, -6);
  s.vertex(-9, -1);
  s.vertex(-12, 2);
  s.vertex(-8, 8);
  s.endShape();
  s.beginShape();
  s.vertex(5, -6);
  s.vertex(8, -1);
  s.vertex(5, 2);
  s.vertex(9, 8);
  s.endShape();
  s.pop();
}

function drawCloverIcon(s, a, color) {
  s.push();
  s.scale(1.8);
  s.noStroke();
  // 四片叶子
  const leafColor = s.color(60, 180, 80, a * 255);
  s.fill(leafColor);
  s.ellipse(-7, -7, 14, 14);
  s.ellipse(7, -7, 14, 14);
  s.ellipse(-7, 7, 14, 14);
  s.ellipse(7, 7, 14, 14);
  // 叶脉
  s.stroke(40, 140, 50, a * 200);
  s.strokeWeight(1);
  s.line(0, 0, -7, -7);
  s.line(0, 0, 7, -7);
  s.line(0, 0, -7, 7);
  s.line(0, 0, 7, 7);
  // 茎
  s.stroke(60, 120, 40, a * 255);
  s.strokeWeight(2);
  s.noFill();
  s.bezier(0, 4, 2, 14, -2, 18, 1, 24);
  // 金框（徽章感）
  s.noFill();
  s.stroke(220, 190, 60, a * 255);
  s.strokeWeight(2);
  s.ellipse(0, 0, 36, 36);
  s.pop();
}

// ── 背景光柱 ─────────────────────────────────────
function drawLightBeam(s, x, y, color, pulse) {
  s.push();
  s.noStroke();
  const baseAlpha = 15 + Math.sin(pulse) * 8;
  for (let i = 3; i >= 0; i--) {
    const c = s.color(color);
    c.setAlpha(baseAlpha - i * 3);
    s.fill(c);
    const w = 40 + i * 30;
    s.beginShape();
    s.vertex(x - w / 2, 0);
    s.vertex(x + w / 2, 0);
    s.vertex(x + 15, y);
    s.vertex(x - 15, y);
    s.endShape(s.CLOSE);
  }
  s.pop();
}

// ── 粒子系统 ────────────────────────────────────
function updateAndDrawParticles(s, particles) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.03; // 微重力
    p.life -= p.decay;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    const c = s.color(p.color);
    c.setAlpha(p.life * 255);
    s.noStroke();
    s.fill(c);
    s.ellipse(p.x, p.y, p.size * p.life, p.size * p.life);
  }
}

function updateAndDrawRays(s, rays) {
  for (let i = rays.length - 1; i >= 0; i--) {
    const r = rays[i];
    r.life -= r.decay;
    if (r.life <= 0) { rays.splice(i, 1); continue; }
    s.push();
    s.translate(r.x, r.y);
    s.rotate(r.angle);
    const c = s.color(r.color);
    c.setAlpha(r.life * 100);
    s.stroke(c);
    s.strokeWeight(r.width * r.life);
    s.line(0, 0, 0, -r.length);
    s.pop();
  }
}
