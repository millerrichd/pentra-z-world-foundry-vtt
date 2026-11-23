/**
 * Z-World survival (p. 3): eating, starvation, scavenging and Survival Kits, all on the Survival Die.
 */
import { CoreRules, Rolls } from "./core.js";
import { MODULE, SYSTEM, ZWORLD } from "./config.js";
import * as R from "./rules.js";

const SOCKET = `module.${MODULE}`;
const MECH = { pentraMechanic: true };
const loc = key => game.i18n.localize(key);
const fmt = (key, data) => game.i18n.format(key, data);
const die = faces => CoreRules.formatDie(faces);
const { renderTemplate } = foundry.applications.handlebars;
const { DialogV2 } = foundry.applications.api;

/** Warn and report that nothing happened. */
function warn(text) {
  ui.notifications.warn(text);
  return null;
}

/** A chat card in the core's simple style (lines are plain text). */
async function card(actor, { title, subtitle, lines, rolls = [] }) {
  const content = await renderTemplate(`systems/${SYSTEM}/templates/chat/simple.hbs`, { title, subtitle, lines });
  return ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls });
}

const setSurvivalDie = (actor, value) => actor.update({ "system.survivalDie.value": value }, MECH);

/* -------------------------------------------------------------------------- */
/*  Meals and starvation                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Eat a Meal (p. 3): any time, at least once a day. A Survival Die usage check against 1–2; either way the
 * character has eaten, which holds starvation off.
 */
export async function eatMeal(actor) {
  const current = actor.system.survivalDie.value;
  if (!current) return warn(fmt("ZWORLD.Meal.NoFood", { name: actor.name }));
  const result = await Rolls.rollUsage({
    actor, label: loc("ZWORLD.Meal.Label"), die: current, range: ZWORLD.mealRange,
    note: loc("ZWORLD.Meal.Note"),
    onReduce: next => setSurvivalDie(actor, next)
  });
  if (!result) return null;
  await actor.update({ "system.survival.ate": true, "system.survival.hungryDays": 0 }, MECH);
  return result;
}

/**
 * Starvation (p. 3), checked at each night's rest (Camp, or a Day of rest in the city): without a meal since the
 * last one, a Death Die usage check against 1 to the days gone hungry. The Death Die never recovers in Z-World.
 * Every rest starts a new day, so the character needs to eat again.
 */
export async function checkStarvation(actor, kind) {
  if (actor?.type !== "character" || !["camp", "city"].includes(kind)) return;
  const { ate, hungryDays } = actor.system.survival;
  const hunger = R.starvation(ate, hungryDays);
  await actor.update({ "system.survival.ate": false, "system.survival.hungryDays": hunger?.days ?? 0 }, MECH);
  if (!hunger) return;
  const death = actor.system.deathDie.value;
  if (!death) return;
  return Rolls.rollUsage({
    actor, label: loc("ZWORLD.Starvation.Label"), die: death, range: hunger.range,
    note: fmt("ZWORLD.Starvation.Note", { days: hunger.days }),
    onReduce: next => actor.update({ "system.deathDie.value": next }, MECH)
  });
}

/* -------------------------------------------------------------------------- */
/*  Survival Die rewards (food found, animals hunted)                         */
/* -------------------------------------------------------------------------- */

/** The party: every player-owned character, plus the one who found the food. */
export function partyOf(actor) {
  const members = game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
  if (!members.includes(actor)) members.push(actor);
  return members.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * One person's find feeds everyone (p. 3): each party member rolls the same reward against their own Survival Die.
 * If the user doesn't own every member, the active GM's client rolls it.
 */
export async function shareReward(finder, reward, what) {
  const members = partyOf(finder);
  if (members.every(a => a.isOwner)) return applyReward(finder, members, reward, what);
  if (!game.users.activeGM) {
    ui.notifications.warn(loc("ZWORLD.Scavenge.NeedGM"));
    return applyReward(finder, [finder], reward, what);
  }
  game.socket.emit(SOCKET, { action: "shareReward", userId: game.user.id, finderUuid: finder.uuid, reward, what });
}

async function applyReward(finder, members, reward, what) {
  const lines = [];
  const rolls = [];
  for (const actor of members) {
    const from = actor.system.survivalDie.value;
    const result = await R.rewardDie(from, reward, async faces => {
      const roll = await new Roll(`1d${faces}`).evaluate();
      rolls.push(roll);
      return roll.total;
    });
    if (result.die !== from) await setSurvivalDie(actor, result.die);
    const shown = result.rolls.map(r => r.result).join(", ");
    lines.push(fmt(result.die > from ? "ZWORLD.Reward.Raised" : "ZWORLD.Reward.Held", {
      name: actor.name, from: die(from), to: die(result.die), rolls: shown || "—"
    }));
  }
  return card(finder, {
    title: fmt("ZWORLD.Reward.Title", { what }),
    subtitle: fmt("ZWORLD.Reward.Subtitle", { die: die(reward) }),
    lines, rolls
  });
}

/** Active GM only: share a reward a player found, if they own the finder. */
async function handleSocket({ action, userId, finderUuid, reward, what }) {
  if (action !== "shareReward" || !game.users.activeGM?.isSelf) return;
  const user = game.users.get(userId);
  const finder = await fromUuid(finderUuid);
  if (!user || finder?.type !== "character" || !finder.testUserPermission(user, "OWNER")) return;
  if (![ZWORLD.scavenge.food.reward, ZWORLD.scavenge.hunt.reward].includes(reward)) return;
  return applyReward(finder, partyOf(finder), reward, String(what ?? ""));
}

export function registerSurvivalSocket() {
  game.socket.on(SOCKET, handleSocket);
}

/* -------------------------------------------------------------------------- */
/*  Scavenging                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Scavenging (p. 3), a short downtime activity: say what you're looking for, then a Survival check. Food is a d4
 * Survival Die reward for the party, hunting an animal a d6; a kit's supplies are a d4 reward on that kit's usage die,
 * up to the Durability Die.
 */
export async function scavenge(actor) {
  const kits = actor.items.filter(i => i.type === "fieldkit");
  const options = [
    `<option value="food">${loc("ZWORLD.Scavenge.Food")}</option>`,
    `<option value="hunt">${loc("ZWORLD.Scavenge.Hunt")}</option>`,
    ...kits.map(k => `<option value="kit:${k.id}">${foundry.utils.escapeHTML(fmt("ZWORLD.Scavenge.KitSupplies", { kit: k.name, die: die(k.system.usage) }))}</option>`)
  ].join("");
  const target = await DialogV2.prompt({
    window: { title: fmt("ZWORLD.Scavenge.Title", { name: actor.name }), icon: "fa-solid fa-magnifying-glass" },
    content: `<p class="hint">${loc("ZWORLD.Scavenge.Hint")}</p>
      <div class="form-group"><label>${loc("ZWORLD.Scavenge.LookingFor")}</label><select name="scavengeTarget">${options}</select></div>`,
    ok: {
      label: loc("ZWORLD.Scavenge.Roll"), icon: "fa-solid fa-dice-d12",
      callback: (event, button) => button.form.elements.namedItem("scavengeTarget").value
    },
    rejectClose: false
  });
  if (!target) return null;

  const kit = target.startsWith("kit:") ? actor.items.get(target.slice(4)) : null;
  const what = kit ? kit.name : loc(target === "hunt" ? "ZWORLD.Scavenge.Hunt" : "ZWORLD.Scavenge.Food");
  const msg = await Rolls.rollCheck(actor, {
    type: "skill", key: "survival",
    label: fmt("ZWORLD.Scavenge.RollLabel", { what }),
    note: loc("ZWORLD.Scavenge.Note")
  });
  if (!msg) return null;
  if (!msg.getFlag(SYSTEM, "success")) {
    return card(actor, { title: fmt("ZWORLD.Scavenge.Title", { name: actor.name }), lines: [fmt("ZWORLD.Scavenge.Nothing", { name: actor.name, what })] });
  }
  if (kit) {
    const from = kit.system.usage ?? 0;
    const max = R.kitCap(actor.system.durabilityDie?.value);
    const title = fmt("ZWORLD.Scavenge.Title", { name: actor.name });
    if (from >= max) return card(actor, { title, lines: [fmt("ZWORLD.Scavenge.KitFull", { kit: kit.name, to: die(from) })] });
    const rolls = [];
    const result = await R.rewardDie(from, ZWORLD.scavenge.kit.reward, async faces => {
      const roll = await new Roll(`1d${faces}`).evaluate();
      rolls.push(roll);
      return roll.total;
    }, { max });
    if (result.die !== from) await kit.update({ "system.usage": result.die });
    const shown = result.rolls.map(r => r.result).join(", ") || "—";
    return card(actor, {
      title,
      subtitle: fmt("ZWORLD.Scavenge.KitSubtitle", { die: die(ZWORLD.scavenge.kit.reward) }),
      lines: [fmt(result.die > from ? "ZWORLD.Scavenge.KitRaised" : "ZWORLD.Scavenge.KitHeld", { kit: kit.name, from: die(from), to: die(result.die), rolls: shown })],
      rolls
    });
  }
  return shareReward(actor, ZWORLD.scavenge[target].reward, what);
}

/* -------------------------------------------------------------------------- */
/*  Survival Kits                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Eat from a Survival Kit (p. 3), once per 10-minute activity: a usage check for the kit, then a maximum usage
 * check on the Survival Die (it rises a size on its highest face; an empty one becomes a d4).
 */
export async function useSurvivalKit(actor) {
  const kit = actor.items.filter(i => i.type === "fieldkit" && i.system.kitType === "survival" && i.system.usage > 0)
    .sort((a, b) => b.system.usage - a.system.usage)[0];
  if (!kit) return warn(fmt("ZWORLD.Kit.None", { name: actor.name }));

  const usage = await Rolls.rollUsage({
    actor, label: kit.name, die: kit.system.usage, range: 2,
    onReduce: next => kit.update({ "system.usage": next })
  });
  if (!usage) return null;

  const from = actor.system.survivalDie.value;
  const roll = from ? await new Roll(`1d${from}`).evaluate() : null;
  const to = R.kitMealDie(from, roll?.total ?? 0);
  if (to !== from) await setSurvivalDie(actor, to);
  const line = !from ? fmt("ZWORLD.Kit.FromEmpty", { to: die(to) })
    : fmt(to > from ? "ZWORLD.Kit.Raised" : "ZWORLD.Kit.Held", { roll: roll.total, from: die(from), to: die(to) });
  return card(actor, {
    title: fmt("ZWORLD.Kit.Title", { kit: kit.name }),
    subtitle: `${loc("ZWORLD.Trait.survivalDie")} ${die(from)}`,
    lines: [line], rolls: roll ? [roll] : []
  });
}
