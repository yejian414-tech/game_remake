// game/src/entities/Character.js
export class Character {
  constructor(name, hp, maxHp) {
    this.name = name;
    this.hp = hp;
    this.maxHp = maxHp;
    this.attack = 10;
    this.speed = 5;
    this.type = 'neutral';
    this.q = 0; this.r = 0;
    this.x = 0; this.y = 0;
    this.targetX = 0; this.targetY = 0;
  }

  update(deltaTime) {
    const lerpSpeed = 0.1;
    this.x += (this.targetX - this.x) * lerpSpeed;
    this.y += (this.targetY - this.y) * lerpSpeed;
  }

  setGridPos(q, r, map) {
    this.q = q; this.r = r;
    const pos = map.getTile(q, r).getCanvasPos(map.tileSize);
    this.targetX = pos.x; this.targetY = pos.y;
    if (this.x === 0 && this.y === 0) {
      this.x = this.targetX; this.y = this.targetY;
    }
  }

  isAlive() { return this.hp > 0; }
}