// Hero.js
export default class Hero {
  constructor(name, q, r, stats) {
    this.name = name;
    this.q = q;          // 六边形坐标 Q
    this.r = r;          // 六边形坐标 R
    this.hp = 100;
    this.maxHp = 100;
    this.moves = 5;      // 当前剩余步数
    this.maxMoves = 5;   // 初始总步数
    this.stats = stats;  // 属性值，如 { strength: 75, focus: 3 }
  }

  // 处理移动，成功返回 true
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

  // 恢复状态（回合结束调用）
  refresh() {
    this.moves = this.maxMoves;
  }

  // 判定逻辑：传入需要的成功槽数
  rollCheck(targetStat, slotCount) {
    let successes = 0;
    for (let i = 0; i < slotCount; i++) {
      if (Math.random() * 100 <= this.stats[targetStat]) {
        successes++;
      }
    }
    return successes;
  }
}