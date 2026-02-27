// main.js
import { GameController } from './src/core/GameController.js';
import { GameState, MapConfig } from './src/core/Constants.js';
import { GameLoop } from './src/core/GameLoop.js';
import { HexMap } from './src/world/HexMap.js';
import { Camera } from './src/world/Camera.js';
import { Player } from './src/entities/Player.js';
import { DataLoader } from './src/data/DataLoader.js';
// ⚠️ 保持你的容错修复：严格匹配你本地的小写文件名 Inputhandler.js
import { InputHandler } from './src/core/Inputhandler.js';
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

// ── 启动游戏 ─────────────────────────────────────────────────
async function init() {
  // 1. 加载数据（完美保留你的增强型报错提示）
  try {
    await DataLoader.loadAll();
  } catch (error) {
    alert("数据加载失败！请检查 src/data/ 目录下是否有 DataLoader.js, heroes.json 和 skills.json！");
    console.error(error);
    return;
  }

  // 2. 初始化核心组件
  const map = new HexMap(MapConfig.RADIUS, MapConfig.TILE_SIZE);
  const camera = new Camera(canvas.width, canvas.height);
  const player = new Player('Leader');

  // 3. 初始相机对准左下起始位
  const bottomLeft = hexToPixel(-MapConfig.RADIUS, MapConfig.RADIUS, MapConfig.TILE_SIZE);
  camera.x = MapConfig.PADDING - bottomLeft.x;
  camera.y = canvas.height - MapConfig.PADDING - bottomLeft.y;

  // 4. UIManager 深度缝合：对齐所有 DOM 节点
  const reactRoot = document.getElementById('react-combat-root');

  const ui = new UIManager(
    {
      charSelectScreen: document.getElementById('char-select-screen'),
      heroSlots: document.getElementById('hero-slots'),
      charConfirmBtn: document.getElementById('char-confirm-btn'),
      charSelectedInfo: document.getElementById('char-selected-info'),
      mapGenScreen: document.getElementById('map-gen-screen'),
      hud: document.getElementById('hud'),
      movementEl: document.getElementById('movement-points'),

      // ── ⚠️ 战斗节点核心避坑 ──
      // 新版 HTML 删除了 combat-ui，这里将 combatUI 和 reactCombatRoot
      // 指向同一个 React 容器！防止 style.display 报错崩溃。
      combatUI: reactRoot,
      reactCombatRoot: reactRoot,

      // ── 缝合点：事件系统节点（适配队友的陷阱、祭坛弹窗） ──
      eventUI: document.getElementById('event-ui'),
      eventTitle: document.getElementById('event-title'),
      eventDesc: document.getElementById('event-desc'),
      eventButtons: document.getElementById('event-buttons')
    },
    {
      // 战斗结束后通知 controller 切回探索状态
      onCombatEnd: (result) => {
        console.log(`[Main] 战斗结束: ${result}`);
        gameController.fsm.transition(GameState.MAP_EXPLORATION);
      }
    }
  );

  // 5. 初始化控制器
  const gameController = new GameController(map, player, ui);

  // 6. 输入处理
  const inputHandler = new InputHandler(
    canvas,
    camera,
    () => gameController.map,
    gameController
  );
  inputHandler.bind(document.getElementById('end-turn-btn'));

  // 7. 启动状态机进入角色选择
  gameController.fsm.transition(GameState.CHARACTER_SELECT);

  // 8. 启动游戏主循环
  new GameLoop(
    dt => gameController.update(dt),
    () => gameController.render(ctx, camera)
  ).start();
}

init();