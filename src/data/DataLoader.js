// game_remake/src/data/DataLoader.js
export class DataLoader {
  static heroMap = null;
  static skillMap = null;
  static images = {};
  static audio = {}; 

  static async loadAll() {
    // 1. 加载 JSON 数据
    const [heroRes, skillRes] = await Promise.all([
      fetch('./src/data/heroes.json'),
      fetch('./src/data/skills.json')
    ]);

    const heroData = await heroRes.json();
    const skillData = await skillRes.json();

    this.heroMap = new Map(heroData.heroes.map(h => [h.id, h]));
    this.skillMap = new Map(skillData.skills.map(s => [s.id, s]));

    // 2. 预加载图片资源（增加了 hero 路径）
    const imagePaths = {
      'hero': './resource/img/normal/hero.png', // 玩家头像图片
      'altar': './resource/img/map/chapter1/altar.png',
      'boss': './resource/img/map/chapter1/boss.png',
      'dungeon': './resource/img/map/chapter1/dungeon.png',
      'treasure': './resource/img/map/chapter1/treasure.png',
      'lighthouse': './resource/img/map/chapter1/lighthouse.png',
      'background': './resource/img/map/chapter1/background.png',
      'grass_1': './resource/img/map/chapter1/grass_1.png',
      'grass_2': './resource/img/map/chapter1/grass_2.png',
      'grass_3': './resource/img/map/chapter1/grass_3.png',
      'grass_4': './resource/img/map/chapter1/grass_4.png',
      'barrier_1': './resource/img/map/chapter1/barrier_1.png',
      'barrier_2': './resource/img/map/chapter1/barrier_2.png',
      'barrier_3': './resource/img/map/chapter1/barrier_3.png',
      'barrier_4': './resource/img/map/chapter1/barrier_4.png',
    };

    // 3. 预加载音频资源
    const audioPaths = {
      'map_bgm': './resource/music/map.mp3',
      'fight_bgm': './resource/music/fight.mp3'
    };

    const imagePromises = Object.entries(imagePaths).map(([name, path]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = path;
        img.onload = () => { this.images[name] = img; resolve(); };
      });
    });

    const audioPromises = Object.entries(audioPaths).map(([name, path]) => {
      return new Promise((resolve) => {
        const audio = new Audio();
        audio.src = path;
        audio.loop = true;
        audio.oncanplaythrough = () => { this.audio[name] = audio; resolve(); };
        audio.load();
      });
    });

    await Promise.all([...imagePromises, ...audioPromises]);
    console.log('[DataLoader] 资源全部加载完成');
  }

  static getHero(id) { return this.heroMap?.get(id) ?? null; }
  static getSkill(id) { return this.skillMap?.get(id) ?? null; }
  static getImage(name) { return this.images[name] || null; }
  static getAudio(name) { return this.audio[name] || null; }

  static getAllHeroes() { return this.heroMap ? [...this.heroMap.values()] : []; }
}