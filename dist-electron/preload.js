"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
//expose an API into renderer
//anything here can be called by Vue via `window.api`
electron_1.contextBridge.exposeInMainWorld('api', {
    ping: () => electron_1.ipcRenderer.invoke('ping'),
    //player state
    getState: () => electron_1.ipcRenderer.invoke('storage:get'),
    setState: (patch) => electron_1.ipcRenderer.invoke('storage:set', patch),
    //import/export
    exportToFile: () => electron_1.ipcRenderer.invoke('storage:exportToFile'),
    importFromFile: () => electron_1.ipcRenderer.invoke('storage:importFromFile'),
});
