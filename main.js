// main.js
import { GameController } from './src/core/GameController.js';
import { GameState, MapConfig } from './src/core/Constants.js';
import { GameLoop } from './src/core/GameLoop.js';
import { HexMap } from './src/world/HexMap.js';
import { Camera } from './src/world/Camera.js';
import { Player } from './src/entities/Player.js';
import { DataLoader } from './src/data/DataLoader.js';
import { InputHandler } from './src/core/InputHandler.js';
import { UIManager } from './src/ui/UIManager.js';

// ── 画布自适应 ───────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ── 工具：轴坐标 → 像素中心 ─────────────────────────────────
function hexToPixel(q, r, size) {
  return {
    x: size * (3 / 2 * q),
    y: size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r),
  };
}

// ── 启动 ─────────────────────────────────────────────────────
async function init() {
  await DataLoader.loadAll();

  // 地图 & 相机
  const map = new HexMap(MapConfig.RADIUS, MapConfig.TILE_SIZE);
  const camera = new Camera(canvas.width, canvas.height);
  const player = new Player('Leader');

  // 初始相机对准左下起始位
  const bottomLeft = hexToPixel(-MapConfig.RADIUS, MapConfig.RADIUS, MapConfig.TILE_SIZE);
  camera.x = MapConfig.PADDING - bottomLeft.x;
  camera.y = canvas.height - MapConfig.PADDING - bottomLeft.y;

  // UIManager：收集所有 DOM 节点，注入 onCombatEnd 回调（后面 gameController 创建后再绑定）
  const ui = new UIManager(
    {
      charSelectScreen: document.getElementById('char-select-screen'),
      heroSlots: document.getElementById('hero-slots'),
      charConfirmBtn: document.getElementById('char-confirm-btn'),
      charSelectedInfo: document.getElementById('char-selected-info'),
      mapGenScreen: document.getElementById('map-gen-screen'),
      hud: document.getElementById('hud'),
      movementEl: document.getElementById('movement-points'),
      turnCountEl: document.getElementById('turn-count'),
      combatUI: document.getElementById('combat-ui'),
      skillPanel: document.getElementById('skill-panel'),
    },
    {
      // 战斗结束后由 UIManager 通知 controller 切回探索状态
      // 此时 gameController 尚未赋值，使用 getter 延迟引用
      onCombatEnd: (result) => gameController.fsm.transition(GameState.MAP_EXPLORATION),
    }
  );

  // GameController
  const gameController = new GameController(map, player, ui);

  // 输入处理
  const inputHandler = new InputHandler(
    canvas,
    camera,
    () => gameController.map,   // 地图可能在游戏中被替换，用 getter
    gameController
  );
  inputHandler.bind(document.getElementById('end-turn-btn'));

  // 启动状态机
  gameController.fsm.transition(GameState.CHARACTER_SELECT);

  // 游戏循环
  new GameLoop(
    dt => gameController.update(dt),
    () => gameController.render(ctx, camera)
  ).start();
}

init();