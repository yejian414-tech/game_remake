import Hero from '../hero/Hero.js';

// --- 游戏配置 ---
const config = {
  hexSize: 35,
  rows: 9,
  cols: 10,
  origin: { x: 70, y: 70 }
};

const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

let player;
let map = [];

/**
 * 游戏启动入口：异步加载配置并初始化
 * @param {string} classKey - 职业名称 (如 'warrior', 'mage', 'scout')
 */
async function startGame(classKey) {
  try {
    // 1. 获取职业预设数据
    const response = await fetch('./preset.json');
    const presets = await response.json();

    // 2. 初始化英雄：坐标(2,2)，并根据 classKey 从 JSON 中提取属性
    // 注意：构造函数参数需对应：q, r, classKey, configData
    player = new Hero(2, 2, classKey, presets);

    // 3. 生成地图并绑定事件
    initMap();
    bindEvents();

    // 4. 初次渲染
    render();
    addLog(`🌲 欢迎来到法鲁尔边界，当前职业：${player.className}`);
  } catch (error) {
    console.error("初始化失败:", error);
    addLog("❌ 无法加载职业配置，请检查 preset.json 文件。", "log-fail");
  }
}

/**
 * 初始化地图地形
 */
function initMap() {
  map = [];
  for (let r = 0; r < config.rows; r++) {
    for (let q = 0; q < config.cols; q++) {
      let type = 'land';
      const rand = Math.random();
      if (rand < 0.15) type = 'water';
      else if (rand < 0.3) type = 'forest';
      map.push({ q, r, type });
    }
  }
}

/**
 * 绑定 UI 和 鼠标事件
 */
function bindEvents() {
  // 结束回合
  document.getElementById('btn-end-turn').addEventListener('click', () => {
    player.refresh();
    addLog("🔔 新的回合：步数已恢复。");
    render();
  });

  // 点击移动
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const target = pixelToHex(e.clientX - rect.left, e.clientY - rect.top);
    const hex = map.find(h => h.q === target.q && h.r === target.r);

    // 检查目标是否存在且是否相邻（距离为1）
    if (hex && getDistance(player, target) === 1) {
      if (hex.type === 'water') return addLog("🚫 无法通过深水区域。");

      if (player.moveTo(target.q, target.r)) {
        if (Math.random() > 0.8) handleRandomEvent();
        render();
      } else {
        addLog("❌ 体力不足，请结束回合！");
      }
    }
  });
}

/**
 * 渲染主循环
 */
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  map.forEach(hex => {
    const { x, y } = getHexPos(hex.q, hex.r);
    // 对比玩家坐标和格子坐标
    const isPlayerHere = (player.q === hex.q && player.r === hex.r);

    // 绘制六边形
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      ctx.lineTo(x + (config.hexSize - 3) * Math.cos(angle), y + (config.hexSize - 3) * Math.sin(angle));
    }
    ctx.closePath();

    const colors = { land: '#2ecc71', water: '#3498db', forest: '#1b4d3e' };
    ctx.fillStyle = isPlayerHere ? '#f1c40f' : colors[hex.type];
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.stroke();

    // 如果英雄在此格，绘制文字
    if (isPlayerHere) {
      ctx.fillStyle = "black";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.fillText(player.name, x, y + 5);
    }
  });

  updateUI();
}

/**
 * 随机遭遇事件
 */
function handleRandomEvent() {
  addLog("🎲 遭遇挑战，正在判定力量...");
  const successes = player.rollCheck('strength', 3);

  if (successes >= 2) {
    addLog(`✅ 判定通过 (${successes}/3)！你感觉充满力量。`, "log-success");
  } else {
    player.takeDamage(15);
    addLog(`💥 判定失败 (${successes}/3)！HP -15`, "log-fail");
  }
}

// --- 核心数学工具函数 ---

function getHexPos(q, r) {
  const x = config.hexSize * Math.sqrt(3) * (q + r / 2) + config.origin.x;
  const y = config.hexSize * 3 / 2 * r + config.origin.y;
  return { x, y };
}

function pixelToHex(px, py) {
  const x = px - config.origin.x;
  const y = py - config.origin.y;
  const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / config.hexSize;
  const r = (2 / 3 * y) / config.hexSize;
  return axialRound(q, r);
}

function axialRound(q, r) {
  let x = q, z = r, y = -x - z;
  let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
  const xDiff = Math.abs(rx - x), yDiff = Math.abs(ry - y), zDiff = Math.abs(rz - z);
  if (xDiff > yDiff && xDiff > zDiff) rx = -ry - rz;
  else if (yDiff > zDiff) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

function getDistance(a, b) {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

function addLog(msg, className = "") {
  const logBox = document.getElementById('log');
  const entry = document.createElement('div');
  entry.className = `log-entry ${className}`;
  entry.innerText = `> ${msg}`;
  logBox.prepend(entry);
}

function updateUI() {
  document.getElementById('hp-val').innerText = player.hp;
  document.getElementById('moves-val').innerText = player.moves;
}

// --- 启动执行 ---
// 你可以通过更改这里的参数来测试不同职业：'warrior', 'mage', 'scout'
startGame('warrior');