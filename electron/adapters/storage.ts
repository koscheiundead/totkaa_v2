import Store from 'electron-store';
import { z } from 'zod';

/**
 * Zod schema = runtime validator + type generator
 * it checks JSON at runtime and gives us a TypeScript type
 */
export const OwnedStateSchema = z.object({
  //materials: {[materialId: string]: number >= 0}
  //z.coerce.number() lets "5" (string) become 5 (number) during import
  materials: z.record(z.string(), z.coerce.number().int().min(0)).default({}),
  //armorLevels: {[armorId: string]: 0 | 1 | 2 | 3 | 4}
  armorLevels: z.record(z.string(), z.coerce.number().int().min(0).max(4)).default({})
});

/** TypeScript type inferred from Zod schema */
export type OwnedState = z.infer<typeof OwnedStateSchema>

/** Default empty state */
const DEFAULT_STATE: OwnedState = { materials: {}, armorLevels: {} };

//typed store to help TS know the shape we'll call get/set
type StoreShape = {
  materials: Record<string, number>,
  armorLevels: Record<string, number> //zod will guarantee our specific number set
};

/**
 * electron-store writes a JSON file under the app's userData dir
 * we give it our type so `store.store` is typed as OwnedState
 */
const store = new Store<StoreShape>({
  name: 'player-state',
  //make sure what's already on the disk is valid on first run
  migrations: {
    '1.0.0': (s) => {
      const current = {
        materials: s.get('materials', {}) as StoreShape['materials'],
        armorLevels: s.get('armorLevels', {}) as StoreShape['armorLevels']
      };
      const parsed = OwnedStateSchema.safeParse(current);
      if (parsed.success) {
        s.set(parsed.data); //set(object) writes both keys atomically
      } else {
        s.clear();
        s.set(DEFAULT_STATE);
      }
    }
  }
});

/**
 * small api we'll call from main.ts via IPC and the renderer via preload
 */
export const storage = {
  //read, validate, return a clean state
  getState(): OwnedState {
    const current = {
      materials: store.get('materials', {}) as StoreShape['materials'],
      armorLevels: store.get('armorLevels', {}) as StoreShape['armorLevels']
    };
    const parsed = OwnedStateSchema.safeParse(current);
    return parsed.success ? parsed.data : DEFAULT_STATE;
  },

  //shallow-merge a patch, validate, persist, return new state
  setState(patch: Partial<OwnedState>): OwnedState {
    const merged: OwnedState = {
      materials: {
        ...store.get('materials', {}),
        ...(patch.materials ?? {})
      },
      armorLevels: {
        ...store.get('armorLevels', {}),
        ...(patch.armorLevels ?? {})
      }
    };
    const next = OwnedStateSchema.parse(merged);
    store.set(next);
    return next;
  },

  //export current state as JSON string
  export(): string {
    return JSON.stringify(this.getState(), null, 2);
  },

  //import raw JSON string, validate, persist, return new state
  import(json: string): OwnedState {
    const raw = JSON.parse(json); //could be anything
    const next = OwnedStateSchema.parse(raw); //validate & coerce
    store.set(next);
    return next;
  }
};
