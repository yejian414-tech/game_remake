// src/data/DataLoader.js
export class DataLoader {
  static heroMap = null;
  static skillMap = null;
  static weaponMap = null;
  static images = {};
  static audio = {};

  static async loadAll() {
    // 1. Load JSON data
    const [heroRes, skillRes, weaponRes] = await Promise.all([
      fetch('./src/data/heroes.json'),
      fetch('./src/data/skills.json'),
      fetch('./src/data/weapons.json')
    ]);

    const heroData   = await heroRes.json();
    const skillData  = await skillRes.json();
    const weaponData = await weaponRes.json();

    this.heroMap   = new Map(heroData.heroes.map(h => [h.id, h]));
    this.skillMap  = new Map(skillData.skills.map(s => [s.id, s]));
    this.weaponMap = new Map((weaponData.weapons || []).map(w => [w.id, w]));

    // 2. Preload image assets
    const imagePaths = {
      'hero': './resource/img/normal/hero.png',
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
      'forest_1': './resource/img/map/chapter1/barrier_3.png',
      'forest_2': './resource/img/map/chapter1/barrier_3.png',
      'forest_3': './resource/img/map/chapter1/barrier_4.png',
      'forest_4': './resource/img/map/chapter1/barrier_4.png',
      'mountain_1': './resource/img/map/chapter1/barrier_1.png',
      'mountain_2': './resource/img/map/chapter1/barrier_1.png',
      'mountain_3': './resource/img/map/chapter1/barrier_2.png',
      'mountain_4': './resource/img/map/chapter1/barrier_2.png',
      'boundary_1': './resource/img/map/chapter1/barrier_1.png',
      'boundary_2': './resource/img/map/chapter1/barrier_1.png',
      'boundary_3': './resource/img/map/chapter1/barrier_2.png',
      'boundary_4': './resource/img/map/chapter1/barrier_2.png',
      'barrier_1': './resource/img/map/chapter1/barrier_1.png',
      'barrier_2': './resource/img/map/chapter1/barrier_2.png',
      'barrier_3': './resource/img/map/chapter1/barrier_3.png',
      'barrier_4': './resource/img/map/chapter1/barrier_4.png',
    };

    // 3. Preload audio assets
    const audioPaths = {
      'map_bgm': './resource/music/map.mp3',
      'fight_bgm': './resource/music/fight.mp3'
    };

    const imagePromises = Object.entries(imagePaths).map(([name, path]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = path;
        img.onload = () => { this.images[name] = img; resolve(); };
        img.onerror = () => resolve();
      });
    });

    const audioPromises = Object.entries(audioPaths).map(([name, path]) => {
      return new Promise((resolve) => {
        const audio = new Audio();
        audio.src = path;
        audio.loop = true;
        audio.oncanplaythrough = () => { this.audio[name] = audio; resolve(); };
        audio.onerror = () => resolve();
        audio.load();
      });
    });

    await Promise.all([...imagePromises, ...audioPromises]);
    console.log('[DataLoader] All assets loaded');
  }

  static getHero(id)    { return this.heroMap?.get(id)   ?? null; }
  static getSkill(id)   { return this.skillMap?.get(id)  ?? null; }
  static getWeapon(id)  { return this.weaponMap?.get(id) ?? null; }
  static getImage(name) { return this.images[name] || null; }
  static getAudio(name) { return this.audio[name]  || null; }

  static getAllHeroes()  { return this.heroMap   ? [...this.heroMap.values()]   : []; }
  static getAllWeapons() { return this.weaponMap ? [...this.weaponMap.values()] : []; }
}