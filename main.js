import Hero from './module/hero/Hero.js';
import Overmap from './module/overmap/overmap.js';

const GAME_CONFIG = {
  hexSize: 35,
  rows: 9,
  cols: 10,
  origin: { x: 70, y: 70 }
};

async function initGame(classKey) {
  try {
    // 1. 加载配置
    const response = await fetch('./module/hero/preset.json');
    const presets = await response.json();

    // 2. 初始化数据模型
    const player = new Hero(2, 2, classKey, presets);

    // 3. 启动地图引擎
    const worldMap = new Overmap('mapCanvas', GAME_CONFIG, player);
    worldMap.init();

    console.log(`🎮 游戏已启动，职业：${player.className}`);
  } catch (err) {
    console.error("启动失败:", err);
  }
}

// 执行启动
initGame('warrior');