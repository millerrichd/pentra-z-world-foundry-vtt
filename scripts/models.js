/**
 * The core character model with Z-World's Survival Die (food and water on hand) and the hunger it tracks.
 */
import { PENTRA, CoreModels } from "./core.js";
import { ZWORLD } from "./config.js";
import { startingSurvivalDie } from "./rules.js";

const fields = foundry.data.fields;

export class ZWorldCharacterModel extends CoreModels.PentraCharacterModel {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      /** Current Survival Die (0 = no food left). Like the Resource Die, it has a starting value, not a maximum. */
      survivalDie: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: ZWORLD.survivalBase, choices: PENTRA.usageDice })
      }),
      /** Starvation (p. 3): whether a meal has been eaten since the last night's rest, and how many days without. */
      survival: new fields.SchemaField({
        ate: new fields.BooleanField({ initial: false }),
        hungryDays: new fields.NumberField({ required: true, integer: true, min: 0, initial: 0 })
      })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    // Lack of Food (d4) and Survivalist (d8) shift the starting die; the core sums their steps per trait.
    this.survivalDie.start = startingSurvivalDie(ZWORLD.survivalBase, this.traitMods?.survivalDie ?? 0);
  }
}
