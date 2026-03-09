// src/ui/TitleScreen.js
// Pixel-art treasure map title screen using p5.js

export class TitleScreen {
  constructor(onStart) {
    this.onStart = onStart;
    this._overlay = null;
    this._p5inst = null;
  }

  show() {
    const onStart = this.onStart;
    const overlay = document.createElement('div');
    overlay.id = 'title-screen-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '500',
      background: '#0a0a14', display: 'flex',
      justifyContent: 'center', alignItems: 'center',
    });
    document.body.appendChild(overlay);
    this._overlay = overlay;

    this._p5inst = new p5(sketch => {
      const W = window.innerWidth;
      const H = window.innerHeight;

      // ── pixel size (all art drawn on a low-res grid then scaled up)
      const PX = 4; // 1 "pixel" = 4 real pixels
      const GW = Math.ceil(W / PX);
      const GH = Math.ceil(H / PX);

      let pg;        // offscreen pixel buffer
      let frame = 0;
      let btnHover = false;
      let started = false;
      let fadeOut = 0;  // 0→1 when fading

      // colour palette (treasure map / For the King vibe)
      const C = {
        sky1: [18, 14, 40],
        sky2: [40, 28, 80],
        sea1: [20, 45, 90],
        sea2: [30, 70, 130],
        seaFoam: [120, 170, 220],
        land1: [90, 130, 60],
        land2: [120, 160, 75],
        mountain: [110, 90, 70],
        mountainSnow: [230, 230, 240],
        sand: [200, 175, 110],
        parchment: [210, 180, 120],
        parchmentDark: [160, 130, 75],
        gold: [255, 200, 50],
        goldDark: [190, 140, 20],
        red: [200, 50, 50],
        star: [255, 240, 180],
        text: [255, 230, 120],
        textShadow: [80, 50, 10],
        btnFace: [180, 130, 40],
        btnHigh: [255, 200, 60],
        btnShad: [80, 50, 10],
        btnText: [255, 245, 200],
        cloud: [200, 190, 230],
        compass: [220, 200, 150],
        path: [160, 120, 60],
      };

      // ── seeded rand (simple LCG) ─────────────────────────
      let seed = 42;
      function rnd() {
        seed = (seed * 1664525 + 1013904223) & 0xffffffff;
        return (seed >>> 0) / 0xffffffff;
      }

      // ── pre-generate static map features ─────────────────
      // islands as filled blobs of pixel coords
      const islands = [
        { cx: 0.25, cy: 0.45, rx: 0.10, ry: 0.07 },
        { cx: 0.65, cy: 0.38, rx: 0.08, ry: 0.06 },
        { cx: 0.50, cy: 0.60, rx: 0.06, ry: 0.05 },
        { cx: 0.15, cy: 0.68, rx: 0.05, ry: 0.04 },
        { cx: 0.80, cy: 0.62, rx: 0.07, ry: 0.05 },
      ];
      // dotted path between islands
      const pathPts = [
        [0.25, 0.45], [0.35, 0.50], [0.50, 0.60], [0.65, 0.38], [0.80, 0.62],
      ];
      // X mark on last island
      const xMark = { x: 0.80, y: 0.62 };

      // decorative mountains per island
      const mountainGroups = [
        { island: 0, peaks: [[-0.02, -0.02], [0.02, -0.03], [0.00, -0.04]] },
        { island: 1, peaks: [[-0.01, -0.02], [0.02, -0.02]] },
        { island: 4, peaks: [[0.00, -0.02], [0.03, -0.03]] },
      ];

      // stars (static positions)
      const stars = [];
      for (let i = 0; i < 90; i++) {
        stars.push({ x: rnd(), y: rnd() * 0.35, bright: rnd(), phase: rnd() * Math.PI * 2, sz: rnd() < 0.3 ? 2 : 1 });
      }

      // clouds
      const clouds = [];
      for (let i = 0; i < 8; i++) {
        clouds.push({ x: rnd(), y: 0.05 + rnd() * 0.20, w: 0.08 + rnd() * 0.10, spd: 0.00003 + rnd() * 0.00004 });
      }

      // wave offsets per column
      const waveOffsets = [];
      for (let gx = 0; gx < GW; gx++) waveOffsets.push(rnd() * Math.PI * 2);

      // ── helper: set pixel in graphics buffer ─────────────
      function pset(g, gx, gy, r, gr, b, a = 255) {
        if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return;
        g.fill(r, gr, b, a);
        g.noStroke();
        g.rect(gx * PX, gy * PX, PX, PX);
      }

      // ── helper: line of pixels ────────────────────────────
      function pline(g, x0, y0, x1, y1, r, gr, b) {
        const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;
        let cx2 = x0, cy2 = y0;
        while (true) {
          pset(g, cx2, cy2, r, gr, b);
          if (cx2 === x1 && cy2 === y1) break;
          const e2 = 2 * err;
          if (e2 > -dy) { err -= dy; cx2 += sx; }
          if (e2 < dx) { err += dx; cy2 += sy; }
        }
      }

      // ── PIXEL FONT 5×7 ────────────────────────────────────
      const FONT = {
        'F': [[1,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,0,0,0]],
        'O': [[0,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[0,1,1,0]],
        'R': [[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,1,0],[1,0,0,1]],
        'T': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
        'H': [[1,0,0,1],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
        'E': [[1,1,1,1],[1,0,0,0],[1,1,1,0],[1,0,0,0],[1,1,1,1]],
        'A': [[0,1,1,0],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
        'S': [[0,1,1,1],[1,0,0,0],[0,1,1,0],[0,0,0,1],[1,1,1,0]],
        'U': [[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,0,0,1],[0,1,1,0]],
        'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
        'N': [[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1]],
        'G': [[0,1,1,1],[1,0,0,0],[1,0,1,1],[1,0,0,1],[0,1,1,1]],
        'B': [[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,0,1],[1,1,1,0]],
        'L': [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
        'W': [[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1]],
        'C': [[0,1,1,1],[1,0,0,0],[1,0,0,0],[1,0,0,0],[0,1,1,1]],
        'K': [[1,0,0,1],[1,0,1,0],[1,1,0,0],[1,0,1,0],[1,0,0,1]],
        'M': [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1]],
        'P': [[1,1,1,0],[1,0,0,1],[1,1,1,0],[1,0,0,0],[1,0,0,0]],
        'D': [[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,0]],
        'V': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],
        'Y': [[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
        ' ': [[0,0,0]],
      };

      function drawPixelText(g, text, startGX, startGY, scale, r, gr, b, shadow = false) {
        let cx2 = startGX;
        for (const ch of text.toUpperCase()) {
          const glyph = FONT[ch] || FONT[' '];
          const rows = glyph.length;
          const cols = glyph[0].length;
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              if (glyph[row][col]) {
                for (let sy = 0; sy < scale; sy++) {
                  for (let sx = 0; sx < scale; sx++) {
                    if (shadow) {
                      pset(g, cx2 + col * scale + sx + 2, startGY + row * scale + sy + 2,
                        C.textShadow[0], C.textShadow[1], C.textShadow[2]);
                    } else {
                      pset(g, cx2 + col * scale + sx, startGY + row * scale + sy, r, gr, b);
                    }
                  }
                }
              }
            }
          }
          cx2 += (cols + 1) * scale;
        }
        return cx2 - startGX;
      }

      function measureText(text, scale) {
        let w = 0;
        for (const ch of text.toUpperCase()) {
          const glyph = FONT[ch] || FONT[' '];
          w += (glyph[0].length + 1) * scale;
        }
        return w;
      }

      // ── DRAW STATIC MAP (into pg) ─────────────────────────
      function drawStaticMap() {
        pg.background(...C.sky1);

        // night sky gradient (top)
        for (let gy = 0; gy < GH * 0.35; gy++) {
          const t = gy / (GH * 0.35);
          const r2 = lerp(C.sky1[0], C.sky2[0], t);
          const g2 = lerp(C.sky1[1], C.sky2[1], t);
          const b2 = lerp(C.sky1[2], C.sky2[2], t);
          for (let gx = 0; gx < GW; gx++) pset(pg, gx, gy, r2, g2, b2);
        }

        // sea background
        for (let gy = Math.floor(GH * 0.30); gy < GH; gy++) {
          const t = (gy - GH * 0.30) / (GH * 0.70);
          const r2 = lerp(C.sea1[0], C.sea2[0], t);
          const g2 = lerp(C.sea1[1], C.sea2[1], t);
          const b2 = lerp(C.sea1[2], C.sea2[2], t);
          for (let gx = 0; gx < GW; gx++) pset(pg, gx, gy, r2, g2, b2);
        }

        // ── islands ─────────────────────────────────────────
        for (const isl of islands) {
          const igx = Math.round(isl.cx * GW);
          const igy = Math.round(isl.cy * GH);
          const irx = Math.round(isl.rx * GW);
          const iry = Math.round(isl.ry * GH);
          // sand coast
          for (let dy = -iry - 2; dy <= iry + 2; dy++) {
            for (let dx = -irx - 2; dx <= irx + 2; dx++) {
              if ((dx * dx) / ((irx + 2) * (irx + 2)) + (dy * dy) / ((iry + 2) * (iry + 2)) <= 1.0) {
                pset(pg, igx + dx, igy + dy, ...C.sand);
              }
            }
          }
          // land fill
          for (let dy = -iry; dy <= iry; dy++) {
            for (let dx = -irx; dx <= irx; dx++) {
              if ((dx * dx) / (irx * irx) + (dy * dy) / (iry * iry) <= 1.0) {
                const col = (dx + dy) % 2 === 0 ? C.land1 : C.land2;
                pset(pg, igx + dx, igy + dy, ...col);
              }
            }
          }
        }

        // ── dotted path ──────────────────────────────────────
        for (let i = 0; i < pathPts.length - 1; i++) {
          const x0 = Math.round(pathPts[i][0] * GW);
          const y0 = Math.round(pathPts[i][1] * GH);
          const x1 = Math.round(pathPts[i + 1][0] * GW);
          const y1 = Math.round(pathPts[i + 1][1] * GH);
          const steps = Math.hypot(x1 - x0, y1 - y0);
          for (let s = 0; s < steps; s += 3) {
            const t2 = s / steps;
            const px2 = Math.round(x0 + (x1 - x0) * t2);
            const py2 = Math.round(y0 + (y1 - y0) * t2);
            pset(pg, px2, py2, ...C.path);
          }
        }

        // ── mountains on islands ─────────────────────────────
        for (const mg of mountainGroups) {
          const isl = islands[mg.island];
          const igx = Math.round(isl.cx * GW);
          const igy = Math.round(isl.cy * GH);
          for (const [pdx, pdy] of mg.peaks) {
            const mx = igx + Math.round(pdx * GW);
            const my = igy + Math.round(pdy * GH);
            const mh = 5 + Math.floor(rnd() * 4);
            for (let h = 0; h <= mh; h++) {
              const hw = mh - h;
              for (let dx = -hw; dx <= hw; dx++) {
                pset(pg, mx + dx, my - h, ...C.mountain);
              }
            }
            // snow cap
            for (let dx = -1; dx <= 1; dx++) pset(pg, mx + dx, my - mh, ...C.mountainSnow);
            pset(pg, mx, my - mh - 1, ...C.mountainSnow);
          }
        }

        // ── X mark ───────────────────────────────────────────
        const xgx = Math.round(xMark.x * GW);
        const xgy = Math.round(xMark.y * GH);
        for (let d = -5; d <= 5; d++) {
          pset(pg, xgx + d, xgy + d, ...C.red);
          pset(pg, xgx + d, xgy - d, ...C.red);
          // thicker
          pset(pg, xgx + d + 1, xgy + d, ...C.red);
          pset(pg, xgx + d + 1, xgy - d, ...C.red);
        }

        // ── compass rose ─────────────────────────────────────
        const compX = Math.round(0.88 * GW);
        const compY = Math.round(0.80 * GH);
        const cr = 14;
        // outer circle
        for (let angle = 0; angle < Math.PI * 2; angle += 0.08) {
          pset(pg, compX + Math.round(Math.cos(angle) * cr), compY + Math.round(Math.sin(angle) * cr), ...C.compass);
        }
        // N pointer
        for (let i = 0; i < cr - 2; i++) {
          pset(pg, compX, compY - i, ...C.gold);
          pset(pg, compX + 1, compY - i, ...C.gold);
        }
        // S pointer
        for (let i = 0; i < cr - 2; i++) pset(pg, compX, compY + i, ...C.compass);
        // E/W
        for (let i = 0; i < cr - 2; i++) {
          pset(pg, compX + i, compY, ...C.compass);
          pset(pg, compX - i, compY, ...C.compass);
        }
        // center jewel
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++)
            if (Math.abs(dx) + Math.abs(dy) <= 2) pset(pg, compX + dx, compY + dy, ...C.gold);
        // N label
        drawPixelText(pg, 'N', compX - 3, compY - cr - 8, 1, ...C.gold);

        // ── decorative border (parchment frame) ──────────────
        const bw = 3;
        for (let gy = 0; gy < GH; gy++) {
          for (let bx = 0; bx < bw; bx++) {
            pset(pg, bx, gy, ...C.parchmentDark);
            pset(pg, GW - 1 - bx, gy, ...C.parchmentDark);
          }
        }
        for (let gx = 0; gx < GW; gx++) {
          for (let by = 0; by < bw; by++) {
            pset(pg, gx, by, ...C.parchmentDark);
            pset(pg, gx, GH - 1 - by, ...C.parchmentDark);
          }
        }
        // corner jewels
        const corners = [[4, 4], [GW - 5, 4], [4, GH - 5], [GW - 5, GH - 5]];
        for (const [cx2, cy2] of corners) {
          for (let dy = -2; dy <= 2; dy++)
            for (let dx = -2; dx <= 2; dx++)
              if (Math.abs(dx) + Math.abs(dy) <= 2) pset(pg, cx2 + dx, cy2 + dy, ...C.gold);
        }

        // ── subtitle "A TREASURE HUNTING ADVENTURE" ──────────
        const sub = 'A TREASURE HUNTING ADVENTURE';
        const subW = measureText(sub, 1);
        const subGX = Math.floor((GW - subW) / 2);
        const subGY = Math.floor(GH * 0.17);
        drawPixelText(pg, sub, subGX + 1, subGY + 1, 1, ...C.textShadow, false);
        drawPixelText(pg, sub, subGX, subGY, 1, ...C.parchment, false);
      }

      function lerp(a, b, t) { return a + (b - a) * t; }

      // ── DRAW ANIMATED LAYER (called each frame) ───────────
      function drawAnimated() {
        // copy static map
        sketch.image(pg, 0, 0);

        // animated stars
        for (const s of stars) {
          const alpha = 120 + Math.floor(Math.sin(frame * 0.04 + s.phase) * 70) + Math.floor(s.bright * 60);
          const gx = Math.floor(s.x * GW);
          const gy = Math.floor(s.y * GH);
          sketch.fill(C.star[0], C.star[1], C.star[2], alpha);
          sketch.noStroke();
          sketch.rect(gx * PX, gy * PX, s.sz * PX, s.sz * PX);
          if (s.sz === 2 && Math.sin(frame * 0.04 + s.phase) > 0.6) {
            sketch.fill(C.star[0], C.star[1], C.star[2], alpha * 0.4);
            sketch.rect((gx - 1) * PX, gy * PX, 3 * PX, PX);
            sketch.rect(gx * PX, (gy - 1) * PX, PX, 3 * PX);
          }
        }

        // animated clouds
        for (const cl of clouds) {
          cl.x = (cl.x + cl.spd) % 1.1;
          const cgx = Math.floor(cl.x * GW);
          const cgy = Math.floor(cl.y * GH);
          const cw = Math.ceil(cl.w * GW);
          const ch2 = 3;
          for (let dy = 0; dy < ch2; dy++) {
            const rowW = cw - dy * 2;
            const rowX = cgx + dy;
            for (let dx = 0; dx < rowW; dx++) {
              if (rowX + dx < 0 || rowX + dx >= GW) continue;
              sketch.fill(C.cloud[0], C.cloud[1], C.cloud[2], 80 - dy * 20);
              sketch.noStroke();
              sketch.rect((rowX + dx) * PX, (cgy + dy) * PX, PX, PX);
            }
          }
        }

        // animated waves
        const waveY = Math.floor(GH * 0.32);
        for (let gx = 0; gx < GW; gx++) {
          const woff = Math.sin(frame * 0.05 + waveOffsets[gx]) * 1.5;
          const wy = waveY + Math.round(woff);
          sketch.fill(C.seaFoam[0], C.seaFoam[1], C.seaFoam[2], 120);
          sketch.noStroke();
          sketch.rect(gx * PX, wy * PX, PX, PX);
          // second wave row
          const woff2 = Math.sin(frame * 0.04 + waveOffsets[gx] + 1.5) * 2;
          const wy2 = waveY + 4 + Math.round(woff2);
          sketch.fill(C.seaFoam[0], C.seaFoam[1], C.seaFoam[2], 60);
          sketch.rect(gx * PX, wy2 * PX, PX, PX);
        }

        // ── TITLE TEXT (large pixel letters) ─────────────────
        // draw onto sketch directly for title
        const title1 = 'FOR THE';
        const title2 = 'TREASURE';
        const tscale = Math.max(3, Math.floor(W / 280));

        const tw1 = measureText(title1, tscale);
        const tw2 = measureText(title2, tscale);

        const tgx1 = Math.floor((GW - tw1) / 2);
        const tgx2 = Math.floor((GW - tw2) / 2);
        const tgy1 = Math.floor(GH * 0.04);
        const tgy2 = tgy1 + 6 * tscale + 2;

        // flicker brightness pulse
        const pulse = 0.85 + Math.sin(frame * 0.06) * 0.15;
        const tc = [Math.floor(C.gold[0] * pulse), Math.floor(C.gold[1] * pulse), Math.floor(C.gold[2] * pulse)];

        // shadow
        sketch.fill(C.textShadow[0], C.textShadow[1], C.textShadow[2], 200);
        sketch.noStroke();
        // draw shadow manually
        const drawTextDirect = (text, gx0, gy0, sc, r2, g2, b2) => {
          let curX = gx0;
          for (const ch of text.toUpperCase()) {
            const glyph = FONT[ch] || FONT[' '];
            const rows = glyph.length;
            const cols = glyph[0].length;
            for (let row = 0; row < rows; row++) {
              for (let col = 0; col < cols; col++) {
                if (glyph[row][col]) {
                  sketch.fill(r2, g2, b2);
                  sketch.noStroke();
                  sketch.rect((curX + col * sc) * PX, (gy0 + row * sc) * PX, sc * PX, sc * PX);
                }
              }
            }
            curX += (cols + 1) * sc;
          }
        };

        // glow halo
        const glowAlpha = Math.floor(20 + Math.sin(frame * 0.06) * 15);
        for (let gi = 3; gi >= 1; gi--) {
          sketch.fill(C.gold[0], C.gold[1], C.gold[2], glowAlpha * gi);
          sketch.noStroke();
          sketch.rect((tgx2 - gi) * PX, (tgy1 - gi) * PX, (tw2 + gi * 2) * PX, (6 * tscale + 6 * tscale + gi * 2) * PX);
        }

        // shadow layer
        drawTextDirect(title1, tgx1 + 1, tgy1 + 1, tscale, C.textShadow[0], C.textShadow[1], C.textShadow[2]);
        drawTextDirect(title2, tgx2 + 1, tgy2 + 1, tscale, C.textShadow[0], C.textShadow[1], C.textShadow[2]);
        // main text
        drawTextDirect(title1, tgx1, tgy1, tscale, tc[0], tc[1], tc[2]);
        drawTextDirect(title2, tgx2, tgy2, tscale, tc[0], tc[1], tc[2]);

        // ── decorative line under title ───────────────────────
        const lineGY = tgy2 + 6 * tscale + 2;
        const lineW = Math.max(tw1, tw2);
        for (let dx = 0; dx < lineW; dx++) {
          const lx = Math.floor((GW - lineW) / 2) + dx;
          sketch.fill(C.goldDark[0], C.goldDark[1], C.goldDark[2], 200);
          sketch.noStroke();
          sketch.rect(lx * PX, lineGY * PX, PX, PX);
          sketch.rect(lx * PX, (lineGY + 2) * PX, PX, PX);
        }

        // ── START button ──────────────────────────────────────
        const btnText = '▶  START ADVENTURE';
        const bscale = Math.max(2, Math.floor(W / 400));
        const btw = measureText(btnText, bscale);
        const btnPadX = 5 * bscale;
        const btnPadY = 3 * bscale;
        const btnW = btw + btnPadX * 2;
        const btnH = 5 * bscale + btnPadY * 2;
        const btnGX = Math.floor((GW - btnW) / 2);
        const btnGY = Math.floor(GH * 0.87);

        // check hover
        const mx = sketch.mouseX / PX, my = sketch.mouseY / PX;
        btnHover = mx >= btnGX && mx <= btnGX + btnW && my >= btnGY && my <= btnGY + btnH;

        const faceCol = btnHover ? C.btnHigh : C.btnFace;
        const hoverPulse = btnHover ? (0.8 + Math.sin(frame * 0.15) * 0.2) : 1;
        const faceColP = faceCol.map(v => Math.min(255, Math.floor(v * hoverPulse)));

        // shadow
        for (let dy = 0; dy < btnH + 2; dy++) {
          for (let dx = 0; dx < btnW + 2; dx++) {
            sketch.fill(0, 0, 0, 120);
            sketch.noStroke();
            sketch.rect((btnGX + 3 + dx) * PX, (btnGY + 3 + dy) * PX, PX, PX);
          }
        }
        // face
        for (let dy = 0; dy < btnH; dy++) {
          for (let dx = 0; dx < btnW; dx++) {
            const edge = dx === 0 || dy === 0;
            const shad = dx === btnW - 1 || dy === btnH - 1;
            let col;
            if (edge) col = [Math.min(255, faceColP[0] + 40), Math.min(255, faceColP[1] + 30), Math.min(255, faceColP[2] + 10)];
            else if (shad) col = C.btnShad;
            else col = faceColP;
            sketch.fill(col[0], col[1], col[2]);
            sketch.noStroke();
            sketch.rect((btnGX + dx) * PX, (btnGY + dy) * PX, PX, PX);
          }
        }
        // button text (skip the ▶ char in font lookup, use a triangle instead)
        const btnLabel = 'START ADVENTURE';
        const labelW = measureText(btnLabel, bscale);
        const labelGX = btnGX + btnPadX + 3 * bscale;
        const labelGY = btnGY + btnPadY;
        drawTextDirect(btnLabel, labelGX, labelGY, bscale, C.btnText[0], C.btnText[1], C.btnText[2]);
        // play triangle
        const triX = (btnGX + btnPadX) * PX;
        const triY = (btnGY + btnPadY) * PX;
        const triS = bscale * PX;
        sketch.fill(C.btnText[0], C.btnText[1], C.btnText[2]);
        sketch.noStroke();
        sketch.triangle(triX, triY, triX, triY + 5 * triS, triX + 4 * triS, triY + 2.5 * triS);

        // cursor
        if (btnHover) sketch.cursor('pointer');
        else sketch.cursor('default');

        // ── fade out veil ─────────────────────────────────────
        if (started) {
          fadeOut = Math.min(1, fadeOut + 0.03);
          sketch.fill(0, 0, 0, Math.floor(fadeOut * 255));
          sketch.noStroke();
          sketch.rect(0, 0, W, H);
          if (fadeOut >= 1) {
            sketch.remove();
            overlay.remove();
          }
        }
      }

      // ── p5 lifecycle ──────────────────────────────────────
      sketch.setup = function () {
        const cnv = sketch.createCanvas(W, H);
        cnv.parent(overlay);
        Object.assign(cnv.elt.style, { display: 'block' });
        sketch.noSmooth();
        sketch.pixelDensity(1);

        pg = sketch.createGraphics(W, H);
        pg.noSmooth();
        pg.pixelDensity(1);
        pg.noStroke();

        drawStaticMap();
      };

      sketch.draw = function () {
        frame++;
        drawAnimated();
      };

      sketch.mousePressed = function () {
        if (started) return;
        const mx = sketch.mouseX / PX, my = sketch.mouseY / PX;
        const tscale = Math.max(3, Math.floor(W / 280));
        const btnText = 'START ADVENTURE';
        const bscale = Math.max(2, Math.floor(W / 400));
        const btw = measureText(btnText, bscale);
        const btnPadX = 5 * bscale;
        const btnPadY = 3 * bscale;
        const btnW = btw + btnPadX * 2 + 3 * bscale;
        const btnH = 5 * bscale + btnPadY * 2;
        const btnGX = Math.floor((GW - btnW) / 2);
        const btnGY = Math.floor(GH * 0.87);
        if (mx >= btnGX && mx <= btnGX + btnW && my >= btnGY && my <= btnGY + btnH) {
          started = true;
          setTimeout(() => {
            // destroy and call onStart after fade
          }, 1200);
          setTimeout(() => {
            onStart();
          }, 800);
        }
      };
    }, overlay);

    this._p5inst = this._overlay._p5 = this._p5inst;
  }
}
