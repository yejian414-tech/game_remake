/**
 * Hero 类：根据职业 Key 自动加载属性
 */
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

    // 根据 classKey 获取对应数据，如果没有找到则默认取 warrior
    const charData = configData[classKey] || configData["warrior"];
    const stats = charData.stats;

    this.#name = "探索者"; // 也可以改为从参数传入
    this.#className = charData.className;

    // 初始化基础数值
    this.#maxHp = 100;
    this.#hp = 100;

    // 从 JSON stats 中提取属性
    this.#strength = stats.strength;
    this.#intelligence = stats.intelligence;
    this.#speed = stats.speed;
    this.#luck = stats.luck;

    // 将移动步数与速度挂钩
    this.#maxMoves = stats.speed;
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