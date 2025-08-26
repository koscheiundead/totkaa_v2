import { contextBridge, ipcRenderer } from "electron";
console.log("preloaded");
//expose an API into renderer
//anything here can be called by Vue via `window.api`
contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('ping'),

  //player state
  getState: () => ipcRenderer.invoke('storage:get') as Promise<{ materials: Record<string, number>; armorLevels: Record<string, number>; }>,
  setState: (patch: Partial<{ materials: Record<string, number>; armorLevels: Record<string, number>; }>) => ipcRenderer.invoke('storage:set', patch),

  setRupees: (amount: number) => ipcRenderer.invoke('rupees:set', amount) as Promise<{ materials: Record<string, number>; armorLevels: Record<string, number>; rupees: number }>,
  resetToDefaults: () => ipcRenderer.invoke('storage:resetDefaults') as Promise<{ materials: Record<string, number>; armorLevels: Record<string, number>;  rupees: number}>,

  //import/export
  exportToFile: () => ipcRenderer.invoke('storage:exportToFile') as Promise<{ canceled: boolean; filePath?: string }>,
  importFromFile: () => ipcRenderer.invoke('storage:importFromFile') as Promise<{ canceled: boolean; filePath?: string; state?: any; }>,

});
