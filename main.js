// src/main.js
import { GameController } from '/src/core/GameController.js';
import { GameState } from '/src/core/Constants.js';
import { GameLoop } from '/src/core/GameLoop.js';
import { HexMap } from '/src/world/HexMap.js';
import { Camera } from '/src/world/Camera.js';
import { Player } from '/src/entities/Player.js';
import { DataLoader } from '/src/data/DataLoader.js';

// ─────────────────────────────────────────────
// 1. Canvas 初始化
// ─────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ─────────────────────────────────────────────
// 2. DOM 引用
// ─────────────────────────────────────────────
const movementEl = document.getElementById('movement-points');
const endTurnBtn = document.getElementById('end-turn-btn');
const hud = document.getElementById('hud');

const eventModal = document.getElementById('event-modal');
const eventText = document.getElementById('event-text');
const eventConfirmBtn = document.getElementById('event-confirm-btn');

const charSelectScreen = document.getElementById('char-select-screen');
const heroSlotsEl = document.getElementById('hero-slots');
const charConfirmBtn = document.getElementById('char-confirm-btn');
const charSelectedInfo = document.getElementById('char-selected-info');

const mapGenScreen = document.getElementById('map-gen-screen');
const mapGenInfo = document.getElementById('map-gen-info');

// ─────────────────────────────────────────────
// 3. UIManager
// TODO: 拆分到 src/ui/UIManager.js
// ─────────────────────────────────────────────
const uiManager = {

  // ── 选角界面 ──────────────────────────────
  showCharacterSelect(onConfirm) {
    charSelectScreen.style.display = 'flex';
    hud.style.display = 'none';

    const selected = [];

    heroSlotsEl.innerHTML = '';
    // ✅ 从 DataLoader 取英雄数据，不再依赖 HeroRoster
    DataLoader.getAllHeroes().forEach(hero => {
      const card = document.createElement('div');
      card.className = 'hero-card';
      card.dataset.id = hero.id;
      card.innerHTML = `
        <div class="hero-name">${hero.name}</div>
        <div class="hero-hp">HP ${hero.hp}</div>
        <div class="hero-desc">${hero.desc}</div>
      `;

      card.addEventListener('click', () => {
        const idx = selected.findIndex(h => h.id === hero.id);
        if (idx !== -1) {
          selected.splice(idx, 1);
          card.classList.remove('selected');
        } else if (selected.length < 2) {
          selected.push(hero);
          card.classList.add('selected');
        }

        charSelectedInfo.textContent =
          selected.length === 0 ? '请选择 2 名英雄' :
            selected.length === 1 ? `已选：${selected[0].name}，再选 1 名` :
              `已选：${selected[0].name} 和 ${selected[1].name}`;

        charConfirmBtn.disabled = selected.length !== 2;
      });

      heroSlotsEl.appendChild(card);
    });

    charConfirmBtn.disabled = true;
    charSelectedInfo.textContent = '请选择 2 名英雄';

    const handleConfirm = () => {
      charConfirmBtn.removeEventListener('click', handleConfirm);
      onConfirm([...selected]);
    };
    charConfirmBtn.addEventListener('click', handleConfirm);
  },

  hideCharacterSelect() {
    charSelectScreen.style.display = 'none';
  },

  // ── 地图生成过渡 ──────────────────────────
  showMapGeneration(selectedHeroes, onReady) {
    mapGenScreen.style.display = 'flex';
    mapGenInfo.textContent =
      `正在为 ${selectedHeroes[0].name} 和 ${selectedHeroes[1].name} 生成世界…`;
    setTimeout(() => onReady(), 800);
  },

  hideMapGeneration() {
    mapGenScreen.style.display = 'none';
  },

  // ── 大地图 HUD ────────────────────────────
  showMapUI() {
    hud.style.display = 'flex';
    console.log('[UI] 显示大地图 UI');
  },

  updateMovementUI(points) {
    movementEl.textContent = `行动力：${points}`;
  },

  // ── 战斗界面（占位）──────────────────────
  showCombatUI(enemyData, onCombatEnd) {
    console.log('[UI] 战斗开始（占位）', enemyData);
    setTimeout(() => onCombatEnd('victory'), 500);
  },

  hideCombatUI() {
    // TODO: 隐藏战斗面板
  },

  // ── 随机事件弹窗 ──────────────────────────
  showEventModal(eventData, onConfirm) {
    eventText.textContent = eventData;
    eventModal.style.display = 'flex';

    const handler = () => {
      eventModal.style.display = 'none';
      eventConfirmBtn.removeEventListener('click', handler);
      onConfirm();
    };
    eventConfirmBtn.addEventListener('click', handler);
  }
};

// ─────────────────────────────────────────────
// 4. 核心变量（init 后赋值）
// ─────────────────────────────────────────────
let map, camera, player, gameController;
let selectedHex = null;
let isDragging = false;
let dragMoved = false;

// ─────────────────────────────────────────────
// 5. 输入事件
// ─────────────────────────────────────────────
function bindInputEvents() {

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragMoved = false;
    camera.startDragging(e.clientX, e.clientY);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
      dragMoved = true;
      camera.drag(e.clientX, e.clientY);
    } else {
      const worldPos = camera.screenToWorld(e.clientX, e.clientY);
      selectedHex = map.pixelToHex(worldPos.x, worldPos.y);
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    camera.stopDragging();
    if (!dragMoved) {
      const worldPos = camera.screenToWorld(e.clientX, e.clientY);
      const { q, r } = map.pixelToHex(worldPos.x, worldPos.y);
      if (map.getTile(q, r)) {
        selectedHex = { q, r };
        gameController.movePlayer(q, r);
      }
    }
    isDragging = false;
  });

  // 触控
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    isDragging = true;
    dragMoved = false;
    camera.startDragging(t.clientX, t.clientY);
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    dragMoved = true;
    camera.drag(t.clientX, t.clientY);
  }, { passive: true });

  canvas.addEventListener('touchend', () => {
    camera.stopDragging();
    isDragging = false;
  });

  // 结束回合
  endTurnBtn.addEventListener('click', () => {
    gameController.onEndTurnBtnClick();
  });
}

// ─────────────────────────────────────────────
// 6. GameLoop 回调
// ─────────────────────────────────────────────
function update(deltaTime) {
  player.update(deltaTime);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  map.draw(ctx, camera, selectedHex);

  ctx.save();
  ctx.translate(camera.x, camera.y);
  player.draw(ctx, map.tileSize);
  ctx.restore();
}

// ─────────────────────────────────────────────
// 7. 异步入口
// ─────────────────────────────────────────────
async function init() {
  // ✅ 数据优先加载
  await DataLoader.loadAll();

  // 核心对象实例化
  map = new HexMap(8, 40);
  camera = new Camera(canvas.width, canvas.height);
  player = new Player('Hero');
  player.setGridPos(0, 0, map);

  // 绑定控制器
  gameController = new GameController(map, player, uiManager);

  // 绑定输入
  bindInputEvents();

  // 启动游戏流程
  gameController.fsm.transition(GameState.CHARACTER_SELECT);

  // 启动渲染循环
  const loop = new GameLoop(update, render);
  loop.start();
}

init();