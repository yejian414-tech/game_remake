// src/data/DataLoader.js
export class DataLoader {
  static heroMap = null;
  static skillMap = null;

  static async loadAll() {
    const [heroRes, skillRes] = await Promise.all([
      fetch('/src/data/heroes.json'),
      fetch('/src/data/skills.json')
    ]);

    const heroData = await heroRes.json();
    const skillData = await skillRes.json();

    // 转成 Map，方便通过 id 直接查找
    this.heroMap = new Map(heroData.heroes.map(h => [h.id, h]));
    this.skillMap = new Map(skillData.skills.map(s => [s.id, s]));

    console.log('[DataLoader] 加载完成', this.heroMap, this.skillMap);
  }

  static getHero(id) {
    return this.heroMap?.get(id) ?? null;
  }

  static getSkill(id) {
    return this.skillMap?.get(id) ?? null;
  }

  // 获取某英雄的完整技能列表
  static getHeroSkills(heroId) {
    const hero = this.getHero(heroId);
    if (!hero) return [];
    return hero.skillIds.map(sid => this.getSkill(sid)).filter(Boolean);
  }

  // 返回所有英雄（用于选角界面）
  static getAllHeroes() {
    return this.heroMap ? [...this.heroMap.values()] : [];
  }
}