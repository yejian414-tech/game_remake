// main.js
import { GameController } from './src/core/GameController.js';
import { GameState, MapConfig } from './src/core/Constants.js';
import { GameLoop } from './src/core/GameLoop.js';
import { HexMap } from './src/world/HexMap.js';
import { Camera } from './src/world/Camera.js';
import { Player } from './src/entities/Player.js';
import { DataLoader } from './src/data/DataLoader.js';
import { InputHandler } from './src/core/InputHandler.js';

// ── DOM 元素 ─────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const movementEl = document.getElementById('movement-points');
const turnCountEl = document.getElementById('turn-count');
const endTurnBtn = document.getElementById('end-turn-btn');
const hud = document.getElementById('hud');

// ── 画布自适应 ───────────────────────────────────────────────
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ── UI 管理器 ────────────────────────────────────────────────
const uiManager = {
  showCharacterSelect(onConfirm) {
    const screen = document.getElementById('char-select-screen');
    const slots = document.getElementById('hero-slots');
    screen.style.display = 'flex';
    const selected = [];
    slots.innerHTML = '';

    DataLoader.getAllHeroes().forEach(hero => {
      const card = document.createElement('div');
      card.className = 'hero-card';
      card.innerHTML = `
        <div style="font-weight:bold;margin-bottom:5px;">${hero.name}</div>
        <div>HP ${hero.hp}</div>
      `;
      card.onclick = () => {
        if (selected.includes(hero)) {
          selected.splice(selected.indexOf(hero), 1);
          card.classList.remove('selected');
        } else if (selected.length < 2) {
          selected.push(hero);
          card.classList.add('selected');
        }
        document.getElementById('char-confirm-btn').disabled = selected.length !== 2;
        document.getElementById('char-selected-info').innerText =
          `已选 ${selected.length}/2 名英雄`;
      };
      slots.appendChild(card);
    });

    document.getElementById('char-confirm-btn').onclick = () => onConfirm([...selected]);
  },

  hideCharacterSelect() {
    document.getElementById('char-select-screen').style.display = 'none';
  },

  showMapGeneration(heroes, onReady) {
    document.getElementById('map-gen-screen').style.display = 'flex';
    setTimeout(onReady, 1000);
  },

  hideMapGeneration() {
    document.getElementById('map-gen-screen').style.display = 'none';
  },

  showMapUI() {
    hud.style.display = 'flex';
  },

  updateMovementUI(points) {
    movementEl.textContent = `行动力：${points}`;
  },

  updateTurnCount(turn) {
    turnCountEl.textContent = `回合：${turn}`;
  },

  showCombatOverlay() {
    document.getElementById('combat-ui').style.display = 'block';
    hud.style.display = 'none';
  },

  hideCombatOverlay() {
    document.getElementById('combat-ui').style.display = 'none';
    hud.style.display = 'flex';
  },

  showCombatCommands(hero, onAction) {
    const panel = document.getElementById('skill-panel');
    panel.innerHTML = '';
    const skills = DataLoader.getHeroSkills(hero.id);
    skills.forEach(skill => {
      const btn = document.createElement('button');
      btn.className = 'skill-btn';
      btn.innerText = skill.name;
      btn.onclick = () => onAction(skill);
      panel.appendChild(btn);
    });
  },

  onCombatResult(result) {
    alert(result === 'win' ? '战斗胜利！' : '不幸阵亡...');
    gameController.fsm.transition(GameState.MAP_EXPLORATION);
  },
};

// ── 工具：轴坐标 → 像素中心 ─────────────────────────────────
function hexToPixel(q, r, size) {
  return {
    x: size * (3 / 2 * q),
    y: size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r),
  };
}

// ── 初始化 ───────────────────────────────────────────────────
let map, camera, player, gameController, inputHandler;

async function init() {
  await DataLoader.loadAll();

  map = new HexMap(MapConfig.RADIUS, MapConfig.TILE_SIZE);
  camera = new Camera(canvas.width, canvas.height);
  player = new Player('Leader');

  const bottomLeft = hexToPixel(-MapConfig.RADIUS, MapConfig.RADIUS, MapConfig.TILE_SIZE);
  camera.x = MapConfig.PADDING - bottomLeft.x;
  camera.y = canvas.height - MapConfig.PADDING - bottomLeft.y;

  gameController = new GameController(map, player, uiManager);

  inputHandler = new InputHandler(
    canvas,
    camera,
    () => gameController.map,
    gameController
  );
  inputHandler.bind(endTurnBtn);

  gameController.fsm.transition(GameState.CHARACTER_SELECT);

  const loop = new GameLoop(
    (dt) => gameController.update(dt),
    () => gameController.render(ctx, camera)
  );
  loop.start();
}

init();