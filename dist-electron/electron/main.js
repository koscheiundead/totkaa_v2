"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const promises_1 = require("node:fs/promises");
const path_1 = __importDefault(require("path"));
const storage_1 = require("./adapters/storage");
//are we packaged(prod) or with vite(dev)?
const isDev = !electron_1.app.isPackaged;
//create a single window
async function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1100,
        height: 700,
        webPreferences: {
            contextIsolation: true, //safety first
            nodeIntegration: false, //no require() in renderer
            sandbox: !isDev, //keep false in dev
            preload: path_1.default.join(__dirname, "preload.js"),
        },
    });
    try {
        if (isDev) {
            //in dev vite serves https://localhost:5173
            await win.loadURL("http://localhost:5173");
        }
        else {
            //in prod, vite built static files to dist-electron/ui
            await win.loadFile(path_1.default.join(__dirname, "../ui/index.html"));
        }
    }
    catch {
        await win.loadFile(path_1.default.join(__dirname, "../ui/index.html"));
    }
    win.webContents.openDevTools({ mode: "detach" }); //separate devtools window
}
//electron lifecycle
electron_1.app.whenReady().then(createWindow);
electron_1.app.on("window-all-closed", () => {
    //on macOS apps usually keep running until cmd+q
    if (process.platform !== "darwin")
        electron_1.app.quit();
});
electron_1.app.on("activate", () => {
    //recreate a window when dock icon is clicked and no windows are open
    if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow();
});
//ping from renderer through preload
electron_1.ipcMain.handle("ping", () => "pong");
//get current state
electron_1.ipcMain.handle("storage:get", () => {
    return storage_1.storage.getState();
});
//patch & save (partial)
electron_1.ipcMain.handle("storage:set", (_evt, patch) => {
    return storage_1.storage.setState(patch);
});
//set rupees
electron_1.ipcMain.handle("rupees:set", (_evt, amount) => {
    return storage_1.storage.setRupees(amount);
});
//reset to catalog defaults
electron_1.ipcMain.handle("storage:resetDefaults", () => {
    return storage_1.storage.resetToDefaults();
});
//export save state to a file (show save dialog)
electron_1.ipcMain.handle("storage:exportToFile", async (evt) => {
    const win = electron_1.BrowserWindow.fromWebContents(evt.sender);
    const { canceled, filePath } = await electron_1.dialog.showSaveDialog(win, {
        title: "Export Player State",
        defaultPath: "player-state.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (canceled || !filePath)
        return { canceled: true };
    const json = storage_1.storage.export();
    await (0, promises_1.writeFile)(filePath, json, "utf-8");
    return { canceled: false, filePath };
});
//import from a file (show open dialog)
electron_1.ipcMain.handle("storage:importFromFile", async (evt) => {
    const win = electron_1.BrowserWindow.fromWebContents(evt.sender);
    const { canceled, filePaths } = await electron_1.dialog.showOpenDialog(win, {
        title: "Import Player State",
        properties: ["openFile"],
        filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (canceled || !filePaths?.[0])
        return { canceled: true };
    const raw = await (0, promises_1.readFile)(filePaths[0], "utf-8");
    const next = storage_1.storage.import(raw);
    return { canceled: false, filePath: filePaths[0], state: next };
});
