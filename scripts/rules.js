/**
 * Pure Z-World rules math (no Foundry), unit tested in tests/rules.test.mjs.
 */

const DICE = [0, 4, 6, 8, 10, 12];

/** Step a die up or down by sizes (0 is depleted). */
export function stepDie(faces, delta, { min = 0, max = 12 } = {}) {
  const i = DICE.indexOf(Number(faces) || 0);
  const next = DICE[Math.min(Math.max((i < 0 ? 0 : i) + delta, 0), DICE.length - 1)];
  return Math.min(Math.max(next, min), max);
}

/** The starting Survival Die: d6, shifted by Lack of Food / Survivalist (never below d4). */
export function startingSurvivalDie(base, steps) {
  return stepDie(base, steps, { min: 4 });
}

/**
 * The lowest face that raises a die from a reward worth `rewardDie` (the core's reward rule, as for the Resource
 * Die): a reward at or above the die raises it on the top two faces, a smaller one only on its maximum.
 */
export function rewardThreshold(rewardDie, die) {
  return rewardDie >= die ? die - 1 : die;
}

/**
 * Raise a die from a reward (p. 3: "works like a Resource Die Reward"). An empty die can't be rolled, so it simply
 * becomes a d4 and stops there. Otherwise it rolls; on the threshold or better it rises a size, and rolls again while
 * the reward is still bigger than the die. Used for the Survival Die (d4 food, d6 hunting) and for a kit's usage
 * die (d4 supplies, up to the Durability Die).
 * @param {number} die        Current die (0 = empty)
 * @param {number} rewardDie  The reward's die
 * @param {(faces:number)=>number|Promise<number>} roll  Rolls a die (injected for tests)
 * @param {{max?: number}} [opts]  The largest the die can become (a kit's Durability Die); 12 by default
 * @returns {Promise<{die:number, rolls:{faces:number,result:number,threshold:number,raised:boolean}[], fromZero:boolean}>}
 */
export async function rewardDie(die, rewardDie, roll, { max = 12 } = {}) {
  if (!die) return { die: 4, rolls: [], fromZero: true };
  const rolls = [];
  while (die < max) {
    const threshold = rewardThreshold(rewardDie, die);
    const result = await roll(die);
    const raised = result >= threshold;
    rolls.push({ faces: die, result, threshold, raised });
    if (!raised) break;
    die = stepDie(die, 1, { max });
    if (rewardDie <= die) break;
  }
  return { die, rolls, fromZero: false };
}

/**
 * A Survival Kit consumed into the Survival Die (p. 3): a "maximum usage check" on the Survival Die, so it rises one
 * size on its highest face. An empty Survival Die becomes a d4.
 */
export function kitMealDie(die, result) {
  if (!die) return 4;
  return result >= die ? stepDie(die, 1) : die;
}

/** The most a scavenged kit can be restocked to: the character's Durability Die (at least a d4). */
export function kitCap(durability) {
  return Math.max(Number(durability) || 0, 4);
}

/**
 * Starvation (p. 3): each day without a meal adds one to the range of a Death Die usage check (1 to the days not
 * eaten). Eating resets it.
 * @returns {{days:number, range:number}|null}  null if the character ate
 */
export function starvation(ate, hungryDays) {
  if (ate) return null;
  const days = (Number(hungryDays) || 0) + 1;
  return { days, range: days };
}
