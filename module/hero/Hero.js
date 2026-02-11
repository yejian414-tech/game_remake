
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

  constructor(q, r, classKey, configData) {
    this.q = q;
    this.r = r;

    // 根据 classKey 获取对应数据
    const charData = configData[classKey];

    this.#name = charData.Name;
    this.#className = charData.className;

    // 从 JSON charData.stats 中提取属性
    this.#maxHp = charData.stats.maxHp;
    this.#strength = charData.stats.strength;
    this.#intelligence = charData.stats.intelligence;
    this.#speed = charData.stats.speed;
    this.#luck = charData.stats.luck;

    this.#hp = 100;

    // 将移动步数与速度挂钩
    this.#maxMoves = charData.stats.speed;
    this.#moves = this.#maxMoves;
  }

  // Getter 保持不变...
  get name() { return this.#name; }
  get className() { return this.#className; }
  get hp() { return this.#hp; }
  get moves() { return this.#moves; }





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