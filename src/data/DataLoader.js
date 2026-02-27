// game_remake/src/data/DataLoader.js
export class DataLoader {
  static heroMap = null;
  static skillMap = null;

  static async loadAll() {
    // 修正：使用相对路径确保在子文件夹中也能正确加载
    const [heroRes, skillRes] = await Promise.all([
      fetch('./src/data/heroes.json'),
      fetch('./src/data/skills.json')
    ]);

    const heroData = await heroRes.json();
    const skillData = await skillRes.json();

    this.heroMap = new Map(heroData.heroes.map(h => [h.id, h]));
    this.skillMap = new Map(skillData.skills.map(s => [s.id, s]));

    console.log('[DataLoader] 加载完成', this.heroMap, this.skillMap);
  }

  static getHero(id) { return this.heroMap?.get(id) ?? null; }
  static getSkill(id) { return this.skillMap?.get(id) ?? null; }

  static getHeroSkills(heroId) {
    const hero = this.getHero(heroId);
    if (!hero || !hero.skillIds) return [];
    return hero.skillIds.map(sid => this.getSkill(sid)).filter(Boolean);
  }

  static getAllHeroes() { return this.heroMap ? [...this.heroMap.values()] : []; }
}