import type { ArmorId, Level, MaterialId, OwnedState, UpgradeCost } from "./types";
import armorPieces from "../data/armor_pieces.json";
import { RUPEES_BY_LEVEL } from "./currency";

//find max level by armor so we don't need to look this up more than once
const maxLevelByArmor: Record<ArmorId, Level> = Object.fromEntries(
  armorPieces.map((p) => [p.id as ArmorId, p.maxLevel as Level])
);

export function calculateShortfall(
  owned: OwnedState,
  costs: UpgradeCost[],
  targetLevels?: Partial<Record<ArmorId, Level>>
): {
  byMaterial: Record<
    MaterialId,
    { have: number; needed: number; missing: number }
  >;
  rupees: { have: number; needed: number; missing: number };
} {
  //prepare quick-access structures
  const currentLevels = owned.armorLevels;
  const materialsOwned = owned.materials;
  const rupeesInWallet = owned.rupees;

  //decide target level for each armor piece we know about
  const effectiveTarget: Partial<Record<ArmorId, Level>> = {};

  for (const piece of armorPieces as Array<{ id: ArmorId; maxLevel: Level }>) {
    const armorId = piece.id;
    const maxLevel = maxLevelByArmor[armorId];
    const current = currentLevels?.[armorId] ?? 0;
    const requested = targetLevels ? (targetLevels[armorId] ?? maxLevel) : maxLevel; // check for a target or assign our max level
    //we only need to calculate shortfall, only matters if levelling up
    if (requested >= current) {
      effectiveTarget[armorId] = Math.min(requested, maxLevel) as Level;
    }
  }

  //walk cost steps and accumulate what we need
  const neededPerMaterial = new Map<MaterialId, number>();
  let neededRupees = 0;

  //helper for adding to the map
  const addNeeded = (materialId: MaterialId, quantity: number) =>
    neededPerMaterial.set(
      materialId,
      (neededPerMaterial.get(materialId) ?? 0) + quantity
    );

  for (const step of costs) {
    const armorId = step.armorId;
    const target = effectiveTarget[armorId];
    if (target == null) continue; //either no upgrade needed or we don't know that armor
    const current = currentLevels[armorId] ?? 0;
    const level = step.level;

    //if the level is greater than where we currently are and where we need to be...
    if (level >= current + 1 && level <= target) {
      //add materials
      for (const requirement of step.requirements) {
        addNeeded(requirement.materialId, requirement.quantity);
      }
      //add the rupees as well
      neededRupees += RUPEES_BY_LEVEL[level];
    }
  }

  //build shortfall object by comparing with owned
  const byMaterial: Record<
    MaterialId,
    { have: number; needed: number; missing: number }
  > = {};
  for (const [materialId, needed] of neededPerMaterial) {
    const have = materialsOwned[materialId] ?? 0;
    const missing = Math.max(0, needed - have);
    byMaterial[materialId] = { have, needed, missing };
  }

  //rupees (from input, we know our current allotment)
  const rupees = {
    have: rupeesInWallet,
    needed: neededRupees,
    missing: Math.max(0, neededRupees - rupeesInWallet),
  };

  return { byMaterial, rupees };
};
