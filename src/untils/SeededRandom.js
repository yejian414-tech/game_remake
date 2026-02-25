// src/utils/SeededRandom.js
export class SeededRandom {
  constructor(seed) {
    this.seed = typeof seed === 'string' ? SeededRandom.hashString(seed) : seed;
    this._state = this.seed >>> 0;
  }

  next() {
    this._state += 0x6d2b79f5;
    let t = this._state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }

  pick(arr) {
    return arr[this.nextInt(0, arr.length)];
  }

  static hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    return hash >>> 0;
  }

  static randomSeed() {
    return Math.floor(Math.random() * 0xffffffff);
  }
}