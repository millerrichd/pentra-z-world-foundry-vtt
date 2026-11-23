# Pentra: Z-World (Foundry VTT v14 module)

The **Z-World** zombie survival setting for **Pentra: Five-Dice Engine**, implementing the Z-World rules v0.4 on top of the core system. It isn't about killing zombies, but about surviving once the infrastructure collapses: finding food, keeping gear going, and staying alive.

**Requires** the [Pentra: Five-Dice Engine Core](https://github.com/millerrichd/pentra-core-foundry-vtt) system, **v0.5.3 or later**. That version lets a setting add its own die trait and turn lifestyles off, which this module uses.

Z-World, Sentius and Edgeliner are separate settings: enable only one of them in a world.

## Install for development

Symlink this folder into your Foundry data directory so the folder name matches the module id:

```sh
ln -s "$(pwd)" "$HOME/Library/Application Support/FoundryVTT/Data/modules/pentra-z-world-foundry-vtt"
```

Then enable **Pentra: Z-World** in a world that uses the Pentra core system.

```sh
npm install          # dev tooling (Foundry CLI for compendiums)
npm test             # rules math tests (plain Node, no Foundry needed)
npm run build:packs  # compile src/packs/*.json -> packs/ (close Foundry first)
npm run unpack       # pull compendium edits made in Foundry back into src/packs/
```

## What's implemented

| Rule | How it works in Foundry |
| --- | --- |
| **Survival Die** (p. 2) | Food and water on hand, next to the Resource Die in the sheet header. Starts at d6. Like the Resource Die it has a starting value, not a maximum, and players can't edit it (the GM can). |
| **Lack of Food / Survivalist** (p. 2) | A hindrance (starting Survival Die d4) and a talent (d8) in this module's compendiums. They work like the core's trait hindrances and talents. |
| **Eat a Meal** (p. 3) | **Downtime → Short Downtime → Eat a Meal**, any time: a Survival Die usage check against 1–2. Either way you've eaten. The row shows whether you've eaten today. With an empty Survival Die there's nothing to eat. |
| **Starvation** (p. 3) | Each night's rest (Camp, or a Day of rest in the city) starts a new day. If you haven't eaten since the last one, roll the Death Die against 1 to the days gone hungry; eating resets the count. |
| **Scavenging** (p. 3) | **Short Downtime → Scavenge**: pick what you're looking for (food, hunting an animal, or supplies for one of your kits), then a Survival check. Food is a d4 Survival Die reward and an animal a d6, rolled for **everyone in the party** against their own Survival Die (the core's reward rule: top face, or top two when the reward is as big as the die). Kit supplies raise that kit's usage die one size. |
| **Survival Kit** (p. 3) | **Short Downtime → Eat from Survival Kit**: a usage check for the kit, then the Survival Die rises one size on its highest face (an empty one becomes d4). |
| **City downtime** (p. 3) | No lifestyles, so city activities don't need one. The clinic, Refresh kits and Socialize are gone, and so are the Sell buttons (no markets). Day of rest and projects remain; training with Karma works as usual. |
| **Bestiary** (p. 4) | Zombie Citizen, Zombie Security Guard (with a Bulletproof Vest and a Reloading Kit one size up) and Wolf or Wild Dog. |
| **No Drain Die** | There are no powers, so the sheet never shows the Drain Die, and the module turns off the core's **Show Drain Die** setting (Sentius and Edgeliner turn it on, and it stays on in a world that used them). |
| **Gear** | Unchanged: use the core's compendiums. Starting gear is bought with the Resource Die as usual. |

## Compendiums

Z-World Hindrances (Lack of Food), Talents (Survivalist), Bestiary.

## Rules interpretations

These are places where the rulebook is ambiguous or silent. Each one is easy to change.

- **When a day ends**: the book says to eat "at least once a day" without saying when the day turns over. Here a night's rest (Camp or a Day of rest) is the turn of the day: it checks starvation and starts the next day hungry.
- **The party** for a shared find is every player-owned character. If the finder's player doesn't own them all, the GM's client rolls it (a GM must be connected).
- **Hunting** is one of the things you can scavenge for, with the same Survival check.
- **Survival Kit**: "a maximum usage check on your Survival Die" is read as: roll it, and it rises a size on its highest face.
- **Kit supplies** raise a kit up to the character's Durability Die (the size a full kit starts at), not past it.
- **Zombie Security Guard** carries a "Reloading or Trauma Kit"; the compendium copy has a Reloading Kit. Swap it if you like.
- **Death Die**: with no clinics it never recovers on its own. The module doesn't stop anything else that might restore it (the GM can still edit it).

## Core changes (0.5.3)

| Change | Used for |
| --- | --- |
| Hindrances and talents shift any die trait with a stored value (core `shiftTraitPool`), not just the core's | Lack of Food, Survivalist |
| `PENTRA.useLifestyles`: a setting can turn lifestyles off, and city activities then don't need one | No lifestyles in Z-World |

The module also uses the existing core hook `pentraRest` (starvation) and the core's `PROTECTED_FIELDS` list (the Survival Die and hunger can't be edited by players).

## Project layout

```
module.json                  manifest (requires the core system ≥ 0.5.3; packs)
scripts/main.js              adds the Survival Die trait, turns lifestyles off, registers everything
scripts/core.js              the one place that imports the core system's code
scripts/config.js            Z-World tables
scripts/rules.js             pure rules math (unit tested)
scripts/models.js            the character model with the Survival Die and hunger
scripts/survival.js          meals, starvation, scavenging, Survival Kits, sharing finds
scripts/sheets/              the character sheet (additions to the core tabs)
lang/  css/
src/packs/                   compendium source JSON (source of truth)
packs/                       compiled LevelDB compendiums
tests/                       node:test suites
```
