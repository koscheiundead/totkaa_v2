import allCosts from '../data/upgrade_costs.json';
import { calculateShortfall } from './calculateShortfall';
import type { OwnedState, UpgradeCost } from './types';

export function calculateShortfallToMax(
  owned: OwnedState,
  costs: UpgradeCost[] = allCosts as UpgradeCost[]
) {
  //no target levels passed, defaults to each piece's maxLevel
  return calculateShortfall(owned, costs);
}
