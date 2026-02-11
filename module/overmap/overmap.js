
export default class Overmap {
  constructor(canvasId, config, player) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.config = config;
    this.player = player;
    this.map = [];
  }

  /**
   * 外部调用：初始化并开始渲染
   */
  init() {
    this.initMap();
    this.bindEvents();
    this.render();
    this.addLog(`🌲 欢迎来到法鲁尔边界，当前职业：${this.player.className}`);
  }

  /**
   * 初始化地图地形
   */
  initMap() {
    this.map = [];
    for (let r = 0; r < this.config.rows; r++) {
      for (let q = 0; q < this.config.cols; q++) {
        let type = 'land';
        const rand = Math.random();
        if (rand < 0.15) type = 'water';
        else if (rand < 0.3) type = 'forest';
        this.map.push({ q, r, type });
      }
    }
  }

  /**
   * 绑定交互事件
   */
  bindEvents() {
    // 结束回合逻辑
    const btnEndTurn = document.getElementById('btn-end-turn');
    if (btnEndTurn) {
      btnEndTurn.addEventListener('click', () => {
        this.player.refresh();
        this.addLog("🔔 新的回合：步数已恢复。");
        this.render();
      });
    }

    // 地图点击移动逻辑
    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const target = this.pixelToHex(e.clientX - rect.left, e.clientY - rect.top);
      const hex = this.map.find(h => h.q === target.q && h.r === target.r);

      // 检查目标是否存在且是否相邻
      if (hex && this.getDistance(this.player, target) === 1) {
        if (hex.type === 'water') return this.addLog("🚫 无法通过深水区域。");

        if (this.player.moveTo(target.q, target.r)) {
          if (Math.random() > 0.8) this.handleRandomEvent();
          this.render();
        } else {
          this.addLog("❌ 体力不足，请结束回合！");
        }
      }
    });
  }

  /**
   * 渲染循环
   */
  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.map.forEach(hex => {
      const { x, y } = this.getHexPos(hex.q, hex.r);
      const isPlayerHere = (this.player.q === hex.q && this.player.r === hex.r);

      // 绘制六边形
      this.ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i - 30);
        this.ctx.lineTo(x + (this.config.hexSize - 3) * Math.cos(angle), y + (this.config.hexSize - 3) * Math.sin(angle));
      }
      this.ctx.closePath();

      const colors = { land: '#2ecc71', water: '#3498db', forest: '#1b4d3e' };
      this.ctx.fillStyle = isPlayerHere ? '#f1c40f' : colors[hex.type];
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      this.ctx.stroke();

      if (isPlayerHere) {
        this.ctx.fillStyle = "black";
        this.ctx.font = "bold 10px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText(this.player.name, x, y + 5);
      }
    });

    this.updateUI();
  }

  /**
   * 随机挑战事件逻辑
   */
  handleRandomEvent() {
    this.addLog("🎲 遭遇挑战，正在判定力量...");
    const successes = this.player.rollCheck('strength', 3);

    if (successes >= 2) {
      this.addLog(`✅ 判定通过 (${successes}/3)！你感觉充满力量。`, "log-success");
    } else {
      this.player.takeDamage(15);
      this.addLog(`💥 判定失败 (${successes}/3)！HP -15`, "log-fail");
    }
  }

  // --- 内部数学工具（设为私有或类方法） ---

  getHexPos(q, r) {
    const x = this.config.hexSize * Math.sqrt(3) * (q + r / 2) + this.config.origin.x;
    const y = this.config.hexSize * 3 / 2 * r + this.config.origin.y;
    return { x, y };
  }

  pixelToHex(px, py) {
    const x = px - this.config.origin.x;
    const y = py - this.config.origin.y;
    const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / this.config.hexSize;
    const r = (2 / 3 * y) / this.config.hexSize;
    return this.axialRound(q, r);
  }

  axialRound(q, r) {
    let x = q, z = r, y = -x - z;
    let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
    const xDiff = Math.abs(rx - x), yDiff = Math.abs(ry - y), zDiff = Math.abs(rz - z);
    if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz;
    else if (yDiff > zDiff) ry = -rx - rz;
    else rz = -rx - ry;
    return { q: rx, r: rz };
  }

  getDistance(a, b) {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  }

  addLog(msg, className = "") {
    const logBox = document.getElementById('log');
    if (!logBox) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${className}`;
    entry.innerText = `> ${msg}`;
    logBox.prepend(entry);
  }

  updateUI() {
    const hpEl = document.getElementById('hp-val');
    const moveEl = document.getElementById('moves-val');
    if (hpEl) hpEl.innerText = this.player.hp;
    if (moveEl) moveEl.innerText = this.player.moves;
  }
}