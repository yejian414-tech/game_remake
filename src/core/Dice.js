// src/core/Dice.js

/**
 * 通用骰子判定系统 —— 正态分布版
 *
 * ── 核心思路 ───────────────────────────────────────────────────
 *
 *  1. 固定5段均分区间 [0, maxPoints]，每段宽度相等
 *
 *  2. 由「属性」和「难度」共同决定正态分布的中轴 μ：
 *
 *       netOffset = statBonus - difficulty.penalty     ∈ [-1, 1]
 *       μ = maxPoints/2 + netOffset × (maxPoints/2)
 *
 *     → netOffset = 0  时 μ 在正中央，5档概率近似对称
 *     → netOffset > 0  时 μ 右移，高区段（成功/大成功）概率升高
 *     → netOffset < 0  时 μ 左移，低区段（失败/大失败）概率升高
 *
 *  3. 标准差 σ = maxPoints / SIGMA_DIVISOR（默认5）
 *     σ 控制钟形宽窄：σ 越小结果越集中在均值附近，σ 越大越随机
 *
 *  4. 用 Box-Muller 变换生成正态随机数，clamp 到 [0, maxPoints]
 *     后按区段判定等级
 *
 * ── 概率直觉（σ = maxPoints/5，5段均分）──────────────────────
 *
 *   μ 在正中央（stat ≈ difficulty）：
 *     💀 大失败  ≈ 2%   ❌ 失败  ≈ 24%  ⚪ 普通 ≈ 48%
 *     ✅ 成功    ≈ 24%  🌟 大成功 ≈ 2%
 *     → 中间结果多，极端结果天然稀有
 *
 *   μ 偏右 0.5（stat 明显强于 difficulty）：
 *     💀 ≈ 0%   ❌ ≈ 5%   ⚪ ≈ 24%  ✅ ≈ 48%  🌟 ≈ 23%
 *
 *   μ 偏左 0.5（difficulty 明显强于 stat）：
 *     💀 ≈ 23%  ❌ ≈ 48%  ⚪ ≈ 24%  ✅ ≈ 5%   🌟 ≈ 0%
 */

// ── 判定等级 ─────────────────────────────────────────────────
export const RollGrade = {
  CRITICAL_FAIL: { id: 0, label: '大失败', emoji: '💀' },
  FAIL: { id: 1, label: '失败', emoji: '❌' },
  NORMAL: { id: 2, label: '普通', emoji: '⚪' },
  SUCCESS: { id: 3, label: '成功', emoji: '✅' },
  CRITICAL_SUCCESS: { id: 4, label: '大成功', emoji: '🌟' },
};

// ── 事件难度 ─────────────────────────────────────────────────
/**
 * penalty 归一化到与 statBonus 同一量纲：
 *   netOffset = statBonus - penalty
 *   penalty=0.5 对应"中性难度"，此时 statBonus=0.5 的角色（stat=50,scale=100）
 *   中轴恰好在中央 → 结果最随机
 */
export const Difficulty = {
  TRIVIAL: { id: 0, label: '简单', emoji: '🟢', penalty: 0 },
  EASY: { id: 1, label: '容易', emoji: '🔵', penalty: 0.25 },
  NORMAL: { id: 2, label: '普通', emoji: '⚪', penalty: 0.5 },
  HARD: { id: 3, label: '困难', emoji: '🟠', penalty: 0.75 },
  EXTREME: { id: 4, label: '极难', emoji: '🔴', penalty: 1.0 },
};

// σ = maxPoints / SIGMA_DIVISOR
// 调小 → 结果更集中（属性/难度对抗更决定性）；调大 → 结果更分散（运气比重更高）
const SIGMA_DIVISOR = 5;

// ── 核心：Box-Muller 正态随机数 ──────────────────────────────
/**
 * 返回均值=0、标准差=1 的正态随机数
 */
function gaussianRandom() {
  const u = Math.max(1e-10, Math.random()); // 避免 log(0)
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ── 主函数 ───────────────────────────────────────────────────
/**
 * roll(statValue, maxPoints, options?) → RollResult
 *
 * @param {number} statValue   参与判定的角色数值，>= 0
 * @param {number} maxPoints   区间上限（"骰子面数"），推荐 20 / 100
 * @param {object} [options]
 *   @param {object} [options.difficulty=Difficulty.NORMAL]  事件难度
 *   @param {number} [options.statScale=100]   数值归一化基准
 *                                             使 statBonus = statValue/statScale ∈ [0,~1]
 *   @param {number} [options.sigmaDivisor]    覆盖全局 SIGMA_DIVISOR
 *   @param {number} [options.bias=0]          Buff/Debuff 额外中轴偏移 ∈ [-1, 1]
 *                                             正数向成功方向偏，负数向失败方向偏
 * @returns {RollResult}
 */
export function roll(statValue, maxPoints, options = {}) {
  const {
    difficulty = Difficulty.NORMAL,
    statScale = 100,
    sigmaDivisor = SIGMA_DIVISOR,
    bias = 0,
  } = options;

  // 1. 属性加成 & 难度惩罚（同量纲，直接对抗）
  const statBonus = statValue / statScale;
  const diffPenalty = difficulty.penalty;

  // 2. 净偏移 netOffset ∈ 大致 [-1, 1]
  const netOffset = (statBonus - diffPenalty) + bias;

  // 3. 中轴 μ：netOffset=0 → μ=中央；±1 → μ 偏向两端
  const mid = maxPoints / 2;
  const mu = mid + netOffset * mid;

  // 4. 标准差 σ（固定比例，与 maxPoints 无关）
  const sigma = maxPoints / sigmaDivisor;

  // 5. Box-Muller 采样，clamp 到 [0, maxPoints]
  const rawSample = mu + gaussianRandom() * sigma;
  const sampleRoll = Math.min(maxPoints, Math.max(0, rawSample));

  // 6. 均分5段 → 等级
  const segSize = maxPoints / 5;
  const segIndex = Math.min(4, Math.floor(sampleRoll / segSize));
  const grade = gradeIndexToGrade(segIndex);

  return {
    sampleRoll: Math.round(sampleRoll * 10) / 10,
    maxPoints,
    mu: Math.round(mu * 10) / 10,
    sigma: Math.round(sigma * 10) / 10,
    netOffset: Math.round(netOffset * 100) / 100,
    segIndex,
    gradeIndex: segIndex,
    grade,
    difficulty,
    statValue,
    statBonus: Math.round(statBonus * 100) / 100,
    diffPenalty: Math.round(diffPenalty * 100) / 100,
    bias,
  };
}

// ── 便捷包装 ─────────────────────────────────────────────────

/** 攻击判定（statScale=50 适合 attack 值域 0~50） */
export function rollAttack(attacker, difficulty = Difficulty.NORMAL, maxPoints = 20) {
  return roll(attacker.attack ?? 0, maxPoints, { difficulty, statScale: 50 });
}

/** 防御判定 */
export function rollDefense(defender, difficulty = Difficulty.NORMAL, maxPoints = 20) {
  return roll(defender.defense ?? 0, maxPoints, { difficulty, statScale: 50 });
}

/** 速度 / 先手判定（statScale=10 适合 speed 值域 0~10） */
export function rollSpeed(character, difficulty = Difficulty.NORMAL, maxPoints = 20) {
  return roll(character.speed ?? 0, maxPoints, { difficulty, statScale: 10 });
}

/** 带 Buff/Debuff 偏移的通用判定 */
export function rollWithBias(statValue, maxPoints, bias, difficulty = Difficulty.NORMAL) {
  return roll(statValue, maxPoints, { difficulty, bias });
}

// ── 工具函数 ─────────────────────────────────────────────────

function gradeIndexToGrade(idx) {
  return [
    RollGrade.CRITICAL_FAIL,
    RollGrade.FAIL,
    RollGrade.NORMAL,
    RollGrade.SUCCESS,
    RollGrade.CRITICAL_SUCCESS,
  ][idx];
}

/**
 * 格式化输出判定结果（调试 / UI 用）
 * 示例：🌟 大成功 | 落点 17.4/20 | μ=14.0 σ=4.0 | stat=35(+0.7) 难度=困难(-0.75) 净偏移-0.05
 */
export function formatRoll(result) {
  const { grade, sampleRoll, maxPoints, mu, sigma, statValue, statBonus, difficulty, diffPenalty, netOffset } = result;
  const sign = netOffset >= 0 ? '+' : '';
  return (
    `${grade.emoji} ${grade.label}` +
    ` | 落点 ${sampleRoll}/${maxPoints}` +
    ` | μ=${mu} σ=${sigma}` +
    ` | stat=${statValue}(+${statBonus}) 难度=${difficulty.label}(-${diffPenalty}) 净偏移${sign}${netOffset}`
  );
}