import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

declare global {
  interface Window {
    api: {
      ping: () => Promise<string>;
      getState: () => Promise<{ materials: Record<string, number>; armorLevels: Record<string, number>; }>;
      setState: (patch: Partial<{ materials: Record<string, number>; armorLevels: Record<string, number>; }>) => Promise<any>;
      setRupeees: (amount: number) => Promise<{ materials: Record<string, number>; armorLevels: Record<string, number>, rupees: number }>;
      resetToDefaults: () => Promise<{ materials: Record<string, number>; armorLevels: Record<string, number>, rupees: number }>;
      exportToFile: () => Promise<{ canceled: boolean; filePath?: string }>;
      importFromFile: () => Promise<{ canceled: boolean; filePath?: string; state?: any }>;
    }
  }
}

createApp(App).mount('#app')
