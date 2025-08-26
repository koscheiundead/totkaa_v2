"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.OwnedStateSchema = void 0;
const electron_store_1 = __importDefault(require("electron-store"));
const zod_1 = require("zod");
const armor_pieces_json_1 = __importDefault(require("../../data/armor_pieces.json"));
//build a lookup of maxLevel by armorId once
const maxLevelByArmor = Object.fromEntries(armor_pieces_json_1.default.map(p => [p.id, p.maxLevel]));
/**
 * Zod schema = runtime validator + type generator
 * it checks JSON at runtime and gives us a TypeScript type
 */
exports.OwnedStateSchema = zod_1.z.object({
    //materials: {[materialId: string]: number >= 0}
    //z.coerce.number() lets "5" (string) become 5 (number) during import
    materials: zod_1.z.record(zod_1.z.string(), zod_1.z.coerce.number().int().min(0)).default({}),
    //armorLevels: {[armorId: string]: 0 | 1 | 2 | 3 | 4}
    armorLevels: zod_1.z.record(zod_1.z.string(), zod_1.z.coerce.number().int().min(0).max(4)).default({}),
    rupees: zod_1.z.coerce.number().int().min(0).default(0)
});
/** Default empty state */
const DEFAULT_STATE = { materials: {}, armorLevels: {}, rupees: 0 };
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
                armorLevels: s.get('armorLevels', {}),
            };
            const parsed = exports.OwnedStateSchema.safeParse({ ...current, rupees: 0 });
            s.clear();
            s.set(parsed.success ? parsed.data : DEFAULT_STATE);
        },
        '1.1.0': (s) => {
            const materials = s.get('materials', {});
            const armorLevels = s.get('armorLevels', {});
            const rupees = s.get('rupees') ?? 0;
            const parsed = exports.OwnedStateSchema.safeParse({ materials, armorLevels, rupees });
            s.clear();
            s.set(parsed.success ? parsed.data : DEFAULT_STATE);
        },
        '1.2.0': (s) => {
            const materials = s.get('materials', {});
            const rupees = (s.get('rupees') ?? 0);
            const currentLevels = s.get('armorLevels', {});
            const nextLevels = {};
            //sanitize existing entries
            for (const [armorId, level] of Object.entries(currentLevels)) {
                const raw = Number(level);
                const int = Number.isFinite(raw) ? Math.trunc(raw) : 0;
                const max = maxLevelByArmor[armorId];
                if (typeof max === 'number') {
                    //enforce 0..max, skip unknown ids
                    nextLevels[armorId] = int < 0 ? 0 : int > max ? max : int;
                }
            }
            //add missing armor ids from catalog at level 0
            for (const armorId of Object.keys(maxLevelByArmor)) {
                if (!(armorId in nextLevels))
                    nextLevels[armorId] = 0;
            }
            //validate and persist atomically
            const parsed = exports.OwnedStateSchema.safeParse({
                materials,
                armorLevels: nextLevels,
                rupees
            });
            s.clear();
            s.set(parsed.success ? parsed.data : DEFAULT_STATE);
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
            },
            rupees: (store.get('rupees') ?? 0) + (patch.rupees ?? 0)
        };
        const next = exports.OwnedStateSchema.parse(merged);
        store.set(next);
        return next;
    },
    //replace only rupees value
    setRupees(amount) {
        const current = this.getState();
        const next = exports.OwnedStateSchema.parse({
            materials: current.materials,
            armorLevels: current.armorLevels,
            rupees: amount //zod will coerce and enforce non-negative int
        });
        store.set(next); //atomic wrhite
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
    },
    /** reset to catalog defaults (armor 0 for all known ids, empty materials, rupees 0) */
    resetToDefaults() {
        //build a seeded armorLevels map from catalog
        const seededLevels = Object.fromEntries(armor_pieces_json_1.default.map(p => [p.id, 0]));
        const next = { materials: {}, armorLevels: seededLevels, rupees: 0 };
        const valid = exports.OwnedStateSchema.parse(next);
        store.clear();
        store.set(valid);
        return valid;
    }
};
