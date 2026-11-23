import test from "node:test";
import assert from "node:assert/strict";
import * as R from "../scripts/rules.js";

/** A roller that returns the given results in order. */
const rolls = (...results) => () => results.shift();

test("starting Survival Die: d6, d4 with Lack of Food, d8 with Survivalist", () => {
  assert.equal(R.startingSurvivalDie(6, 0), 6);
  assert.equal(R.startingSurvivalDie(6, -1), 4);
  assert.equal(R.startingSurvivalDie(6, 1), 8);
  assert.equal(R.startingSurvivalDie(6, -3), 4);
});

test("a reward at or above the die raises it on the top two faces, a smaller one only on the max", () => {
  assert.equal(R.rewardThreshold(4, 4), 3);
  assert.equal(R.rewardThreshold(6, 6), 5);
  assert.equal(R.rewardThreshold(4, 6), 6);
  assert.equal(R.rewardThreshold(6, 8), 8);
});

test("food (d4) on a d6 Survival Die: rises only on a 6", async () => {
  assert.equal((await R.rewardDie(6, 4, rolls(5))).die, 6);
  assert.equal((await R.rewardDie(6, 4, rolls(6))).die, 8);
});

test("hunting (d6) on a d4 Survival Die: 3–4 raises it to d6, then it stops (reward no longer bigger)", async () => {
  const r = await R.rewardDie(4, 6, rolls(3, 6));
  assert.equal(r.die, 6);
  assert.equal(r.rolls.length, 1);
});

test("an empty die only becomes a d4, with no roll, whatever the reward", async () => {
  const r = await R.rewardDie(0, 4, rolls(4));
  assert.equal(r.fromZero, true);
  assert.equal(r.die, 4);
  assert.equal(r.rolls.length, 0);
  assert.equal((await R.rewardDie(0, 6, rolls(4))).die, 4);
});

test("Survival Kit: the Survival Die rises on its maximum; empty becomes d4", () => {
  assert.equal(R.kitMealDie(6, 6), 8);
  assert.equal(R.kitMealDie(6, 5), 6);
  assert.equal(R.kitMealDie(0, 1), 4);
  assert.equal(R.kitMealDie(12, 12), 12);
});

test("scavenged kit supplies are a d4 reward on the kit, up to the Durability Die", async () => {
  // A d4 kit: the d4 reward is worth as much, so 3–4 raise it.
  assert.equal((await R.rewardDie(4, 4, rolls(2), { max: 8 })).die, 4);
  assert.equal((await R.rewardDie(4, 4, rolls(3), { max: 8 })).die, 6);
  // A d6 kit: a smaller reward, so only the maximum.
  assert.equal((await R.rewardDie(6, 4, rolls(5), { max: 8 })).die, 6);
  assert.equal((await R.rewardDie(6, 4, rolls(6), { max: 8 })).die, 8);
  // At the Durability Die it can't rise (no roll); a used-up kit comes back as a d4.
  const full = await R.rewardDie(8, 4, rolls(8), { max: 8 });
  assert.equal(full.die, 8);
  assert.equal(full.rolls.length, 0);
  assert.equal((await R.rewardDie(0, 4, rolls(4), { max: 8 })).die, 4);
  // The cap is the Durability Die, never below a d4.
  assert.equal(R.kitCap(10), 10);
  assert.equal(R.kitCap(0), 4);
});

test("starvation: the range grows by a day each day without a meal; eating clears it", () => {
  assert.equal(R.starvation(true, 3), null);
  assert.deepEqual(R.starvation(false, 0), { days: 1, range: 1 });
  assert.deepEqual(R.starvation(false, 2), { days: 3, range: 3 });
});
