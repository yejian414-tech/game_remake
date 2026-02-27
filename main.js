// main.js
import { GameController } from './src/core/GameController.js';
import { GameState, MapConfig } from './src/core/Constants.js';
import { GameLoop } from './src/core/GameLoop.js';
import { HexMap } from './src/world/HexMap.js';
import { Camera } from './src/world/Camera.js';
import { Player } from './src/entities/Player.js';
import { DataLoader } from './src/data/DataLoader.js';
import { InputHandler } from './src/core/Inputhandler.js'; 
import { UIManager } from './src/ui/UIManager.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function hexToPixel(q, r, size) {
  return {
    x: size * (3 / 2 * q),
    y: size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r),
  };
}

async function init() {
  // ⚠️ 增加容错：如果 JSON 路径不对，直接弹窗警告而不是死寂黑屏
  try {
      await DataLoader.loadAll();
  } catch (error) {
      alert("数据加载失败！请检查 src/data/ 目录下是否有 DataLoader.js, heroes.json 和 skills.json！");
      console.error(error);
      return; 
  }

  const map = new HexMap(MapConfig.RADIUS, MapConfig.TILE_SIZE);
  const camera = new Camera(canvas.width, canvas.height);
  const player = new Player('Leader');

  const bottomLeft = hexToPixel(-MapConfig.RADIUS, MapConfig.RADIUS, MapConfig.TILE_SIZE);
  camera.x = MapConfig.PADDING - bottomLeft.x;
  camera.y = canvas.height - MapConfig.PADDING - bottomLeft.y;

  const ui = new UIManager(
    {
      charSelectScreen: document.getElementById('char-select-screen'),
      heroSlots: document.getElementById('hero-slots'),
      charConfirmBtn: document.getElementById('char-confirm-btn'),
      charSelectedInfo: document.getElementById('char-selected-info'),
      mapGenScreen: document.getElementById('map-gen-screen'),
      hud: document.getElementById('hud'),
      movementEl: document.getElementById('movement-points'),
      reactCombatRoot: document.getElementById('react-combat-root')
    },
    {
      onCombatEnd: (result) => gameController.fsm.transition(GameState.MAP_EXPLORATION),
    }
  );

  const gameController = new GameController(map, player, ui);

  const inputHandler = new InputHandler(
    canvas,
    camera,
    () => gameController.map,   
    gameController
  );
  inputHandler.bind(document.getElementById('end-turn-btn'));

  gameController.fsm.transition(GameState.CHARACTER_SELECT);

  new GameLoop(
    dt => gameController.update(dt),
    () => gameController.render(ctx, camera)
  ).start();
}

init();