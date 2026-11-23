/**
 * Z-World tables. Page numbers refer to the Z-World rules v0.4.
 */
export const MODULE = "pentra-z-world-foundry-vtt";
export const SYSTEM = "pentra-core-foundry-vtt";

export const ZWORLD = {
  /** The Survival Die: food and water on hand. Starts at d6 (p. 2). */
  survivalBase: 6,

  /** Eat a Meal: a Survival Die usage check against 1–2 (p. 3). */
  mealRange: 2,

  /**
   * Scavenging (p. 3): a Survival check. Food is a d4 Survival Die reward, hunting an animal a d6 reward; both go to
   * everyone in the party. Searching for a kit's supplies raises that kit's usage die one size.
   */
  scavenge: {
    food: { reward: 4 },
    hunt: { reward: 6 },
    /** A kit's supplies: a d4 reward on that kit's usage die, the same as food. */
    kit: { reward: 4 }
  },

  /** Kits whose supplies can be scavenged (the field kit types that have a usage die worth topping up). */
  scavengeKits: ["reloading", "trauma", "technical", "survival", "climbing", "disguise", "environmental",
    "infiltration", "performance", "scuba", "communication", "other"],

  /** City downtime activities Z-World doesn't have (p. 3): no clinics, no markets, no one to socialize with. */
  removedCityActions: ["visitClinic", "refreshKits", "socialize", "workGig"]
};
