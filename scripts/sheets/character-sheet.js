/**
 * The core character sheet with Z-World's additions: the Survival Die in the header, Eat a Meal, Scavenging and
 * Survival Kits on the Downtime tab, and the city activities and selling that Z-World doesn't have taken away.
 */
import { PentraCharacterSheet } from "../core.js";
import { ZWORLD } from "../config.js";
import { eatMeal, scavenge, useSurvivalKit } from "../survival.js";

const loc = key => game.i18n.localize(key);
const fmt = (key, data) => game.i18n.format(key, data);
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const die = n => (n ? `d${n}` : "0");

export class ZWorldCharacterSheet extends PentraCharacterSheet {
  static DEFAULT_OPTIONS = {
    classes: ["zworld"],
    actions: {
      eatMeal: ZWorldCharacterSheet.#onEatMeal,
      scavenge: ZWorldCharacterSheet.#onScavenge,
      survivalKit: ZWorldCharacterSheet.#onSurvivalKit
    }
  };

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    // Z-World has no powers, so no Drain Die, whatever the world setting says.
    context.showDrain = false;
    return context;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.#addSurvivalDie();
    this.#addSurvivalDowntime();
    this.#removeMissingActivities();
  }

  /**
   * The Survival Die on its own line at the end of the header, after the core dice (the GM can set it; players change
   * it by playing).
   */
  #addSurvivalDie() {
    const root = this.element;
    root.querySelectorAll(".zworld-survival, .zworld-survival-break").forEach(el => el.remove());
    const strip = root.querySelector(".resource-strip");
    if (!strip) return;
    const { value, start } = this.actor.system.survivalDie;
    const block = document.createElement("div");
    block.className = "resource die zworld-survival";
    block.dataset.tooltip = loc("ZWORLD.Survival.Tooltip");
    const control = game.user.isGM
      ? `<select name="system.survivalDie.value">${[0, 4, 6, 8, 10, 12].map(d => `<option value="${d}" ${d === value ? "selected" : ""}>${die(d)}</option>`).join("")}</select>`
      : `<span class="die-static">${die(value)}</span>`;
    block.innerHTML = `<label>${esc(loc("ZWORLD.Trait.survivalDie"))}</label>${control}
      <span class="hint">${esc(loc("PENTRA.Start"))} ${die(start)}</span>`;
    const lineBreak = document.createElement("div");
    lineBreak.className = "zworld-survival-break";
    strip.append(lineBreak, block);
  }

  /** Eat a Meal, Scavenge and the Survival Kit: short (10-minute) activities, so they go in the Short Downtime panel. */
  #addSurvivalDowntime() {
    const root = this.element;
    root.querySelectorAll(".zworld-activity, .zworld-rest-note").forEach(el => el.remove());
    const shortPanel = root.querySelector('.downtime-tab .downtime-panel [data-action="treatWounds"]')?.closest(".downtime-panel");
    const { survivalDie, survival } = this.actor.system;
    if (shortPanel && this.isEditable) {
      const hunger = survival.ate ? loc("ZWORLD.Meal.Fed")
        : survival.hungryDays ? fmt("ZWORLD.Meal.Hungry", { days: survival.hungryDays })
          : loc("ZWORLD.Meal.NotYet");
      const hasKit = this.actor.items.some(i => i.type === "fieldkit" && i.system.kitType === "survival" && i.system.usage > 0);
      const rows = [
        `<button type="button" data-action="eatMeal" ${survivalDie.value ? "" : "disabled"}><i class="fa-solid fa-utensils"></i> ${esc(loc("ZWORLD.Meal.Button"))}</button>
          <span class="hint">${esc(loc("ZWORLD.Meal.Hint"))} <strong class="${survival.ate ? "" : "warning"}">${esc(hunger)}</strong></span>`,
        `<button type="button" data-action="scavenge"><i class="fa-solid fa-magnifying-glass"></i> ${esc(loc("ZWORLD.Scavenge.Button"))}</button>
          <span class="hint">${esc(loc("ZWORLD.Scavenge.ShortHint"))}</span>`,
        `<button type="button" data-action="survivalKit" ${hasKit ? "" : "disabled"}><i class="fa-solid fa-box-open"></i> ${esc(loc("ZWORLD.Kit.Button"))}</button>
          <span class="hint">${esc(loc("ZWORLD.Kit.Hint"))}</span>`
      ];
      for (const html of rows) {
        const row = document.createElement("div");
        row.className = "activity zworld-activity";
        row.innerHTML = html;
        shortPanel.append(row);
      }
    }
    // A night's rest checks for starvation.
    for (const kind of ["camp", "city"]) {
      const hint = root.querySelector(`.downtime-tab [data-action="rest"][data-kind="${kind}"]`)?.closest(".activity")?.querySelector(".hint");
      if (!hint) continue;
      // No lifestyles, so no Extreme Luxury bonus to mention.
      if (kind === "city") hint.textContent = loc("ZWORLD.City.DayRest");
      const note = document.createElement("span");
      note.className = "zworld-rest-note";
      note.textContent = ` ${loc("ZWORLD.Starvation.RestNote")}`;
      hint.append(note);
    }
  }

  /** No clinics, markets or socializing (p. 3): those city activities and the Sell buttons go. */
  #removeMissingActivities() {
    const root = this.element;
    for (const action of ZWORLD.removedCityActions) {
      root.querySelectorAll(`.downtime-tab [data-action="${action}"]`).forEach(el => el.closest(".activity")?.remove());
    }
    root.querySelectorAll('[data-action="itemSell"], [data-action="sellVehicle"]').forEach(el => el.remove());
    const more = root.querySelector('.downtime-tab [data-action="rest"][data-kind="city"]')?.closest(".downtime-panel")?.querySelector(":scope > p.hint");
    if (more) more.textContent = loc("ZWORLD.City.More");
  }

  static #onEatMeal() {
    return eatMeal(this.actor);
  }

  static #onScavenge() {
    return scavenge(this.actor);
  }

  static #onSurvivalKit() {
    return useSurvivalKit(this.actor);
  }
}
