/**
 * Pentra: Z-World — zombie survival setting module for the Pentra: Five-Dice Engine core system.
 *
 * Load order: the core system's scripts run first, then this module. The core builds its data schemas lazily from
 * its shared PENTRA config, so adding the Survival Die trait here (before any document is prepared) lets hindrances
 * and talents modify it.
 */
import { PENTRA, PROTECTED_FIELDS } from "./core.js";
import { MODULE, SYSTEM, ZWORLD } from "./config.js";
import * as rules from "./rules.js";
import { ZWorldCharacterModel } from "./models.js";
import * as Survival from "./survival.js";
import { ZWorldCharacterSheet } from "./sheets/character-sheet.js";

/* -------------------------------------------------------------------------- */
/*  Rules additions to the core config                                        */
/* -------------------------------------------------------------------------- */

/** The Survival Die (p. 2): food and water on hand, starting at d6. Lack of Food and Survivalist shift it. */
PENTRA.traits.survivalDie = { label: "ZWORLD.Trait.survivalDie", type: "die", base: ZWORLD.survivalBase };
/** No lifestyles (p. 3): everyone squats in an abandoned building, so city days don't cost one. */
PENTRA.useLifestyles = false;
/** Like the Resource Die, players change the Survival Die and hunger only by playing (eating, scavenging...). */
PROTECTED_FIELDS.push("survivalDie.value", "survival.ate", "survival.hungryDays");

/* -------------------------------------------------------------------------- */
/*  Init                                                                      */
/* -------------------------------------------------------------------------- */

Hooks.once("init", () => {
  console.log("Pentra | Z-World | Initializing");
  if (game.system.id !== SYSTEM) return;

  CONFIG.ZWORLD = ZWORLD;
  game.zworld = { config: ZWORLD, rules, survival: Survival };

  // The core registered its own models during its init, which ran first.
  CONFIG.Actor.dataModels.character = ZWorldCharacterModel;
  CONFIG.Actor.trackableAttributes.character.value.push("survivalDie.value");

  const { DocumentSheetConfig } = foundry.applications.apps;
  DocumentSheetConfig.registerSheet(Actor, MODULE, ZWorldCharacterSheet, {
    types: ["character"], makeDefault: true, label: "ZWORLD.Sheet.Character"
  });

  // Each night's rest (Camp, or a Day of rest in the city) checks for starvation.
  Hooks.on("pentraRest", (actor, kind) => { Survival.checkStarvation(actor, kind); });
});

Hooks.once("ready", async () => {
  if (game.system.id !== SYSTEM) return;
  Survival.registerSurvivalSocket();
  // No powers in Z-World, so diseases and talents shouldn't offer the Drain Die. Sentius and Edgeliner turn this
  // setting on, and it stays on in a world that used one of them before.
  if (game.user.isActiveGM && game.settings.get(SYSTEM, "showDrainDie")) await game.settings.set(SYSTEM, "showDrainDie", false);
  // Setting modules each replace the character sheet and model, so only one belongs in a world.
  const others = ["pentra-edgeliner-foundry-vtt", "pentra-sentius-foundry-vtt"].filter(id => game.modules.get(id)?.active);
  if (game.user.isGM && others.length) {
    const names = others.map(id => game.modules.get(id).title).join(", ");
    ui.notifications.warn(game.i18n.format("ZWORLD.OtherSetting", { names }), { permanent: true });
  }
});
