<script setup lang="ts">
import { reactive, ref } from 'vue';
import HelloWorld from './components/HelloWorld.vue';

const state = reactive<{ materials: Record<string, number>, armorLevels: Record<string, number> }>({
  materials: {},
  armorLevels: {}
});

const lastAction = ref('');

async function load() {
  const s = await window.api.getState();
  state.materials = { ...s.materials };
  state.armorLevels = { ...s.armorLevels };
  lastAction.value = 'Loaded';
}

function giveMats() {
  state.materials['silent-princess'] = (state.materials['silent-princess'] ?? 0) + 5;
}

function setHelmL1() {
  state.armorLevels['barbarian-helm'] = 1;
}

async function save() {
  await window.api.setState({ materials: state.materials, armorLevels: state.armorLevels });
  lastAction.value = 'Saved';
}

async function exportFile() {
  const res = await window.api.exportToFile();
  lastAction.value = res.canceled ? 'Export canceled' : `Exported to: ${res.filePath}`;
}

async function importFile() {
  const res = await window.api.importFromFile();
  if (!res.canceled && res.state) {
    state.materials = { ...res.state.materials };
    state.armorLevels = { ...res.state.armorLevels };
    lastAction.value = `Imported from: ${res.filePath}`;
  } else {
    lastAction.value = 'Import canceled';
  }
}
</script>

<template>
  <hello-world></hello-world>
  <main style="padding: 1rem;">
    <h1>TOTK Armor (Rewrite MVP)</h1>
    <section style="display:flex; gap:0.5rem; margin: 1rem 0;">
      <button @click="load">Load State</button>
      <button @click="giveMats">+5 Silent Princess</button>
      <button @click="setHelmL1">Barbarian Helm -> L1</button>
      <button @click="save">Save Patch</button>
      <button @click="exportFile">Export JSON</button>
      <button @click="importFile">Import JSON</button>
    </section>
   <pre>{{ state }}</pre>
   <p v-if="lastAction">{{ lastAction }}</p>
  </main>
</template>

<style scoped></style>
