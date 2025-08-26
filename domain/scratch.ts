import type { ArmorId, MaterialId, Level, Material, ArmorPiece, UpgradeCost, OwnedState } from "./types";

//valid examples
const m1: Material = { id: 'silent-princess', name: 'Silent Princess' };
const a1: ArmorPiece = { id: 'barbarian-helm', set: 'Barbarian', name: 'Barbarian Helm', maxLevel: 4 };
const c1: UpgradeCost = {
  armorId: 'barbarian-helm',
  level: 2,
  requirements: [
    { materialId: 'silent-princess', quantity: 3 },
    { materialId: 'lizalfos-horn', quantity: 2}
  ]
};
const state: OwnedState = {
  materials: { 'silent-princess': 5 },
  armorLevels: { 'barbarian-helm': 1 }
};

//invalid
// const badLevel: Level = 5; //error: level must be 0-4 num
// const badPiece: ArmorPiece = {id: 'x', set: 'Set', name: 'Name', maxLevel: 3}; //error: maxLevel must be 4
// state.armorLevel['barbarian-helm'] = 7; //error: level must be 0-4 num, maxLevel = 4
