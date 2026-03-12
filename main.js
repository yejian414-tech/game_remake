// main.js
import { GameController } from './src/core/GameController.js';
import { GameState, MapConfig } from './src/core/Constants.js';
import { GameLoop } from './src/core/GameLoop.js';
import { HexMap, createMapByPreset } from './src/world/HexMap.js';
import { makePortal } from './src/world/Tile.js';
import { Camera } from './src/world/Camera.js';
import { Player } from './src/entities/Player.js';
import { DataLoader } from './src/data/DataLoader.js';
// ⚠️ 保持你的容错修复：严格匹配你本地的小写文件名 Inputhandler.js
import { InputHandler } from './src/core/Inputhandler.js';
import { UIManager } from './src/ui/UIManager.js';
import { TitleScreen } from './src/ui/TitleScreen.js';

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

    // 1. 加载数据
    try {
        await DataLoader.loadAll();
    } catch (error) {
        alert("Data loading failed! Please check if DataLoader.js, heroes.json and skills.json are in the src/data/ directory!");
        console.error(error);
        return;
    }

    // 2. 初始化音乐播放器
    window.BGMPlayer = {
        current: null,
        play(src, loop = true) {
            if (this.current) {
                this.current.pause();
                this.current.currentTime = 0;
            }
            this.current = new Audio(src);
            this.current.loop = loop;
            this.current.volume = 0.5;
            this.current.play();
        },
        stop() {
            if (this.current) {
                this.current.pause();
                this.current.currentTime = 0;
                this.current = null;
            }
        }
    };

    // 2. 显示标题页面，点击 START 后进入游戏
    const titleScreen = new TitleScreen(() => startGame());
    titleScreen.show();
}

function startGame() {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // ── 初始化核心组件 ────────────────────────────────────────
    const map = new HexMap(MapConfig.RADIUS, MapConfig.TILE_SIZE);
    const camera = new Camera(canvas.width, canvas.height);
    const player = new Player('Leader');

    // 播放地图背景音乐
    window.BGMPlayer.play('resource/music/map.mp3');

    // 初始相机对准左下起始位
    const bottomLeft = hexToPixel(-MapConfig.RADIUS, MapConfig.RADIUS, MapConfig.TILE_SIZE);
    camera.x = MapConfig.PADDING - bottomLeft.x;
    camera.y = canvas.height - MapConfig.PADDING - bottomLeft.y;

    // UIManager 深度缝合：对齐所有 DOM 节点
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
            combatUI: reactRoot,
            reactCombatRoot: reactRoot,
            eventUI: document.getElementById('event-ui'),
            eventTitle: document.getElementById('event-title'),
            eventDesc: document.getElementById('event-desc'),
            eventButtons: document.getElementById('event-buttons')
        },
        {
            onCombatEnd: (result) => {
                console.log(`[Main] 战斗结束: ${result}`);
                gameController.fsm.transition(GameState.MAP_EXPLORATION);
            }
        }
    );

    // 初始化控制器
    const gameController = new GameController(map, player, ui, camera);

    // 监听状态切换，切换音乐
    const origTransition = gameController.fsm.transition.bind(gameController.fsm);
    gameController.fsm.transition = function (state, ...args) {
        if (state === 'COMBAT') {
            window.BGMPlayer.play('resource/music/fight.mp3');
        } else if (state === 'MAP_EXPLORATION') {
            window.BGMPlayer.play('resource/music/map.mp3');
        }
        return origTransition(state, ...args);
    };

    // 输入处理
    const inputHandler = new InputHandler(
        canvas,
        camera,
        () => gameController.map,
        gameController
    );
    inputHandler.bind(document.getElementById('end-turn-btn'));

    // 启动状态机进入角色选择
    gameController.fsm.transition(GameState.CHARACTER_SELECT);

    // 启动游戏主循环
    new GameLoop(
        dt => gameController.update(dt),
        () => gameController.render(ctx, camera)
    ).start();
}

init();