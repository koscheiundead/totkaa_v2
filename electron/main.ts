import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { readFile, writeFile } from "node:fs/promises";
import path from "path";
import { storage } from "./adapters/storage";

//are we packaged(prod) or with vite(dev)?
const isDev = !app.isPackaged;

//create a single window
async function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      contextIsolation: true, //safety first
      nodeIntegration: false, //no require() in renderer
      sandbox: !isDev, //keep false in dev
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    //in dev vite serves https://localhost:5173
    await win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" }); //separate devtools window
  } else {
    //in prod, vite built static files to dist-electron/ui
    await win.loadFile(path.join(__dirname, "../ui/index.html"));
  }
}

//electron lifecycle
app.whenReady().then(createWindow);
console.log(app);

app.on("window-all-closed", () => {
  //on macOS apps usually keep running until cmd+q
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  //recreate a window when dock icon is clicked and no windows are open
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

//ping from renderer through preload
ipcMain.handle("ping", () => "pong");

//get current state
ipcMain.handle("storage:get", () => {
  return storage.getState();
});

//patch & save (partial)
ipcMain.handle(
  "storage:set",
  (_evt, patch: Partial<ReturnType<typeof storage.getState>>) => {
    return storage.setState(patch);
  }
);

//set rupees
ipcMain.handle("rupees:set", (_evt, amount: number) => {
  return storage.setRupees(amount);
});

//reset to catalog defaults
ipcMain.handle("storage:resetDefaults", () => {
  return storage.resetToDefaults();
});

//export save state to a file (show save dialog)
ipcMain.handle("storage:exportToFile", async (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender)!;
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Export Player State",
    defaultPath: "player-state.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (canceled || !filePath) return { canceled: true };
  const json = storage.export();
  await writeFile(filePath, json, "utf-8");
  return { canceled: false, filePath };
});

//import from a file (show open dialog)
ipcMain.handle("storage:importFromFile", async (evt) => {
  const win = BrowserWindow.fromWebContents(evt.sender)!;
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Import Player State",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (canceled || !filePaths?.[0]) return { canceled: true };
  const raw = await readFile(filePaths[0], "utf-8");
  const next = storage.import(raw);
  return { canceled: false, filePath: filePaths[0], state: next };
});
