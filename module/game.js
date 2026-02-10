import Hero from './Hero.js';
// game.js
const config = {
  hexSize: 35,
  rows: 9,
  cols: 10,
  origin: { x: 70, y: 70 }
};

const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

// 1. 初始化英雄实例 (从 Hero 类创建)
const player = new Hero("探索者", 2, 2, { strength: 70, intelligence: 60 });

let map = [];

function init() {
  for (let r = 0; r < config.rows; r++) {
    for (let q = 0; q < config.cols; q++) {
      let type = Math.random() < 0.2 ? 'forest' : (Math.random() < 0.1 ? 'water' : 'land');
      map.push({ q, r, type });
    }
  }
  document.getElementById('btn-end-turn').onclick = () => {
    player.refresh();
    addLog("🔔 新的回合：步数已恢复。");
    render();
  };
  render();
}

// --- 渲染逻辑 ---
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  map.forEach(hex => {
    const { x, y } = getHexPos(hex.q, hex.r);
    const isPlayerHere = (player.q === hex.q && player.r === hex.r);

    drawHexagon(x, y, hex.type, isPlayerHere);

    if (isPlayerHere) drawPlayerLabel(x, y);
  });

  updateUI();
}

function drawHexagon(x, y, type, highlight) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    ctx.lineTo(x + (config.hexSize - 3) * Math.cos(angle), y + (config.hexSize - 3) * Math.sin(angle));
  }
  ctx.closePath();

  const colors = { land: '#2ecc71', water: '#3498db', forest: '#1b4d3e' };
  ctx.fillStyle = highlight ? '#f1c40f' : colors[type];
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.stroke();
}

function drawPlayerLabel(x, y) {
  ctx.fillStyle = "black";
  ctx.font = "bold 10px Arial";
  ctx.textAlign = "center";
  ctx.fillText(player.name, x, y + 5);
}

// --- 点击处理 ---
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const target = pixelToHex(e.clientX - rect.left, e.clientY - rect.top);
  const hex = map.find(h => h.q === target.q && h.r === target.r);

  if (hex && getDistance(player, target) === 1) {
    if (hex.type === 'water') return addLog("🚫 无法游过深水。");

    // 调用 Hero 类的方法
    if (player.moveTo(target.q, target.r)) {
      if (Math.random() > 0.8) handleRandomEvent();
      render();
    } else {
      addLog("❌ 体力不足！");
    }
  }
});

function handleRandomEvent() {
  addLog("🎲 遭遇力量判定...");
  const successes = player.rollCheck('strength', 3);

  if (successes >= 2) {
    addLog(`✅ 判定通过 (${successes}/3)！你感觉良好。`, "log-success");
  } else {
    player.takeDamage(15);
    addLog(`💥 判定失败 (${successes}/3)！HP -15`, "log-fail");
  }
}

// (其余数学工具函数 getHexPos, pixelToHex, axialRound, getDistance, addLog, updateUI 与之前一致)
// ... [为了简洁，此处省略重复的数学工具代码]