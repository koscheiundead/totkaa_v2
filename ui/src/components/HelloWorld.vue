<script setup lang="ts">
import type { Level, OwnedState, UpgradeCost } from '../../../domain/types.ts';
import { calculateShortfall } from '../../../domain/calculateShortfall.ts';
import { calculateShortfallToMax } from '../../../domain/calculateShortfallToMax.ts';
import { ref } from 'vue';

const owned = {
  materials: { "mighty-thistle": 3 },
  armorLevels: { "barbarian-helm": 2 as Level }
} satisfies OwnedState

const costs = [
  {
    "armorId": "barbarian-helm",
    "level": 3,
    "requirements": [
      { "materialId": "blue-maned-lynel-saber-horn", "quantity": 3 },
      { "materialId": "blue-maned-lynel-mace-horn", "quantity": 3 },
      { "materialId": "razorclaw-crab", "quantity": 3 }
    ]
  },
  {
    "armorId": "barbarian-helm",
    "level": 4,
    "requirements": [
      { "materialId": "white-maned-lynel-saber-horn", "quantity": 3 },
      { "materialId": "white-maned-lynel-mace-horn", "quantity": 3 },
      { "materialId": "bladed-rhino-beetle", "quantity": 3 }
    ]
  }
] satisfies UpgradeCost[]

// const res = ref(calculateShortfall(10, owned, costs, {"barbarian-helm": 3}));
const res = ref(calculateShortfallToMax(10, owned));
/*
expect:
  byMaterial['silent-princess'] = { have: 3, needed: 5, missing: 2 }
  rupees.needed = 10 + 50 = 60
*/
</script>

<template>
  <h1>{{ res }}</h1>
</template>
