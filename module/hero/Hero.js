
export default class Hero {
  #name;
  #className;
  #hp;
  #maxHp;
  #moves;
  #maxMoves;
  #strength;
  #intelligence;
  #speed;
  #luck;

  constructor(q, r, config) {
    this.q = q;
    this.r = r;

    // 从传入的配置对象中解构
    this.#name = "探索者"; // 或者从 UI 输入获取
    this.#className = config.className;

    // 基础数值
    this.#maxHp = 100;
    this.#hp = 100;

    // 映射 JSON 中的 stats
    const { strength, intelligence, speed, luck } = config.stats;
    this.#strength = strength || 50;
    this.#intelligence = intelligence || 50;
    this.#speed = speed || 4;
    this.#luck = luck || 10;

    // 行动点数通常可以与速度挂钩，例如：maxMoves = speed
    this.#maxMoves = this.#speed;
    this.#moves = this.#maxMoves;
  }

  // Getter 访问器
  get name() { return this.#name; }
  get className() { return this.#className; }
  get hp() { return this.#hp; }
  get moves() { return this.#moves; }
  get speed() { return this.#speed; }


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