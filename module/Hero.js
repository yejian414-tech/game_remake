// Hero.js
export default class Hero {
  constructor(name, q, r, stats) {
    this.name = name;
    this.q = q;          // 轴向坐标 Q
    this.r = r;          // 轴向坐标 R
    this.hp = 100;
    this.maxHp = 100;
    this.moves = 5;      // 当前剩余步数
    this.maxMoves = 5;   // 初始总步数
    this.stats = stats;  // 属性值，如 { strength: 70, intelligence: 60 }
  }

  // 处理移动逻辑
  moveTo(q, r) {
    if (this.moves > 0) {
      this.q = q;
      this.r = r;
      this.moves--;
      return true;
    }
    return false;
  }

  // 受到伤害
  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    return this.hp;
  }

  // 恢复步数（回合结束调用）
  refresh() {
    this.moves = this.maxMoves;
  }

  // 核心判定逻辑：根据属性值进行多槽位判定
  rollCheck(targetStat, slotCount) {
    let successes = 0;
    for (let i = 0; i < slotCount; i++) {
      // 随机 1-100，小于等于属性值则成功
      if (Math.random() * 100 <= this.stats[targetStat]) {
        successes++;
      }
    }
    return successes;
  }
}