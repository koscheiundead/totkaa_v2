//--- Primitive aliases ---
export type ArmorId = string;
export type MaterialId = string;

/**
 * Armor levels are discrete steps, so we're using a union type
 * union types make illegal values impossible at compilation
 * eg: 5 or -1 would be a type error
 */
export type Level = 0 | 1 | 2 | 3 | 4;

// --- core reference data ---
export interface Material {
  id: MaterialId;      // stable, unique, eg: "silent-princess"
  name: string;        // display name, eg: "Silent Princess"
  iconUrl?: string;    // path to img file
}

export interface ArmorPiece {
  id: ArmorId;        // eg: "barbarian-helm"
  set: string;        // eg: "Barbarian"
  name: string;       // eg: "Barbarian Helm"
  maxLevel: 0 | 4;    // most are max 4 but some cannot be upgraded
  slot: 'head' | 'chest' | 'legs'; // union type!
  iconUrl?: string;   // path to icon
  location: string;
  description: string;
}

/** one material requirement inside a recipe */
export interface MaterialRequirement {
  materialId: MaterialId;
  quantity: number;
}

/**  the full cost to upgrade one armor piece from level 0->1 to level 3->4*/
export interface UpgradeCost {
  armorId: ArmorId;
  level: 1 | 2 | 3 | 4; // target level for step's cost
  requirements: MaterialRequirement[]; //multiple materials supported
}

// --- Player-owned / runtime state (persist to disk) ---
/***
 * OwnedState is what we will save/load for the player
 * -materials: how many of each material the player owns
 * -armorLevels: current level for each armor piece
 * `Record<Key, Value>` models sparse dictionaries with string keys
 */
export interface OwnedState {
  materials: Record<MaterialId, number>;
  armorLevels: Record<ArmorId, Level>;
}
