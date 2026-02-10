/**
 * Hero 类：所有核心数值均已私有化 (#)
 */
export default class Hero {
  // 定义私有字段
  #name;
  #hp;
  #maxHp;
  #moves;
  #maxMoves;
  #strength;
  #intelligence;
  #speed;

  constructor(q, r, stats) {
    this.q = q; // 坐标通常保持公开，方便地图计算
    this.r = r;

    this.#maxHp = 100;
    this.#hp = 100;
    this.#strength = stats.strength || 70;
    this.#intelligence = stats.intelligence || 60;

    this.#maxMoves = 5;
    this.#moves = 5;
  }

  // --- Getter (只读访问器) ---
  // 外部代码可以通过 player.hp 读取值，但不能 player.hp = 999
  get name() { return this.#name; }
  get hp() { return this.#hp; }
  get moves() { return this.#moves; }
  get strength() { return this.#strength; }

  // --- 内部逻辑方法 ---

  moveTo(q, r) {
    if (this.#moves > 0) {
      this.q = q;
      this.r = r;
      this.#moves--;
      return true;
    }
    return false;
  }

  takeDamage(amount) {
    this.#hp = Math.max(0, this.#hp - amount);
  }

  refresh() {
    this.#moves = this.#maxMoves;
  }

  rollCheck(targetStatName, slotCount) {
    // 由于属性私有化，我们需要一种方式通过字符串访问它们
    // 这里建立一个内部映射
    const statMap = {
      strength: this.#strength,
      intelligence: this.#intelligence
    };

    const statValue = statMap[targetStatName] || 50;
    let successes = 0;
    for (let i = 0; i < slotCount; i++) {
      if (Math.random() * 100 <= statValue) {
        successes++;
      }
    }
    return successes;
  }
}