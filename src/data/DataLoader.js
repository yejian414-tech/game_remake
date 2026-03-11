// game_remake/src/data/DataLoader.js
export class DataLoader {
  static heroMap = null;
  static skillMap = null;
  static images = {}; // 存储加载后的图片对象

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

    // 2. 预加载图片资源
    const imagePaths = {
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

    const imagePromises = Object.entries(imagePaths).map(([name, path]) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = path;
        img.onload = () => {
          this.images[name] = img;
          resolve();
        };
        img.onerror = reject;
      });
    });

    await Promise.all(imagePromises);
    console.log('[DataLoader] 加载完成', this.heroMap, this.skillMap);
  }

  static getHero(id) { return this.heroMap?.get(id) ?? null; }
  static getSkill(id) { return this.skillMap?.get(id) ?? null; }
  static getImage(name) { return this.images[name] || null; }

  static getHeroSkills(heroId) {
    const hero = this.getHero(heroId);
    if (!hero || !hero.skillIds) return [];
    return hero.skillIds.map(sid => this.getSkill(sid)).filter(Boolean);
  }

  static getAllHeroes() { return this.heroMap ? [...this.heroMap.values()] : []; }
}