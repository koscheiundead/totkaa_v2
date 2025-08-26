"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.OwnedStateSchema = void 0;
const electron_store_1 = __importDefault(require("electron-store"));
const zod_1 = require("zod");
/**
 * Zod schema = runtime validator + type generator
 * it checks JSON at runtime and gives us a TypeScript type
 */
exports.OwnedStateSchema = zod_1.z.object({
    //materials: {[materialId: string]: number >= 0}
    //z.coerce.number() lets "5" (string) become 5 (number) during import
    materials: zod_1.z.record(zod_1.z.string(), zod_1.z.coerce.number().int().min(0)).default({}),
    //armorLevels: {[armorId: string]: 0 | 1 | 2 | 3 | 4}
    armorLevels: zod_1.z.record(zod_1.z.string(), zod_1.z.coerce.number().int().min(0).max(4)).default({})
});
/** Default empty state */
const DEFAULT_STATE = { materials: {}, armorLevels: {} };
/**
 * electron-store writes a JSON file under the app's userData dir
 * we give it our type so `store.store` is typed as OwnedState
 */
const store = new electron_store_1.default({
    name: 'player-state',
    //make sure what's already on the disk is valid on first run
    migrations: {
        '1.0.0': (s) => {
            const current = {
                materials: s.get('materials', {}),
                armorLevels: s.get('armorLevels', {})
            };
            const parsed = exports.OwnedStateSchema.safeParse(current);
            if (parsed.success) {
                s.set(parsed.data); //set(object) writes both keys atomically
            }
            else {
                s.clear();
                s.set(DEFAULT_STATE);
            }
        }
    }
});
/**
 * small api we'll call from main.ts via IPC and the renderer via preload
 */
exports.storage = {
    //read, validate, return a clean state
    getState() {
        const current = {
            materials: store.get('materials', {}),
            armorLevels: store.get('armorLevels', {})
        };
        const parsed = exports.OwnedStateSchema.safeParse(current);
        return parsed.success ? parsed.data : DEFAULT_STATE;
    },
    //shallow-merge a patch, validate, persist, return new state
    setState(patch) {
        const merged = {
            materials: {
                ...store.get('materials', {}),
                ...(patch.materials ?? {})
            },
            armorLevels: {
                ...store.get('armorLevels', {}),
                ...(patch.armorLevels ?? {})
            }
        };
        const next = exports.OwnedStateSchema.parse(merged);
        store.set(next);
        return next;
    },
    //export current state as JSON string
    export() {
        return JSON.stringify(this.getState(), null, 2);
    },
    //import raw JSON string, validate, persist, return new state
    import(json) {
        const raw = JSON.parse(json); //could be anything
        const next = exports.OwnedStateSchema.parse(raw); //validate & coerce
        store.set(next);
        return next;
    }
};
