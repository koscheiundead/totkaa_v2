<script setup lang="ts">
import { ref } from 'vue';
import upgradeCosts from '../../../data/upgrade_costs.json';
import { calculateShortfallToMax } from '../../../domain/calculateShortfallToMax';
import type { UpgradeCost } from '../../../domain/types';

const owned = ref();
const rupeesInWallet = ref(0);
const shortfall = ref();
const getOwned = async () => owned.value = await window.api.getState();
const calculate = () => shortfall.value = calculateShortfallToMax(owned.value, upgradeCosts as UpgradeCost[]);
</script>

<template>
  <p>{{ rupeesInWallet }}</p>
  <p>{{ owned }}</p>
  <p v-if="shortfall">{{ shortfall }}</p>
  <button @click="getOwned">Get Owned State</button>
  <button @click="calculate">Calculate Shortfall</button>
</template>
