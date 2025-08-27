import Store from 'electron-store';
import { z } from 'zod';
import armorPieces from '../../data/armor_pieces.json';

//build a lookup of maxLevel by armorId once
const maxLevelByArmor: Record<string, number> = Object.fromEntries(
  (armorPieces as Array<{ id: string, maxLevel: number }>).map(p => [p.id, p.maxLevel])
);

/**
 * Zod schema = runtime validator + type generator
 * it checks JSON at runtime and gives us a TypeScript type
 */
export const OwnedStateSchema = z.object({
  //materials: {[materialId: string]: number >= 0}
  //z.coerce.number() lets "5" (string) become 5 (number) during import
  materials: z.record(z.string(), z.coerce.number().int().min(0)).default({}),
  //armorLevels: {[armorId: string]: 0 | 1 | 2 | 3 | 4}
  armorLevels: z.record(z.string(), z.coerce.number().int().min(0).max(4)).default({}),
  rupees: z.coerce.number().int().min(0).default(0)
});

/** TypeScript type inferred from Zod schema */
export type OwnedState = z.infer<typeof OwnedStateSchema>

/** Default empty state */
const DEFAULT_STATE: OwnedState = { materials: {}, armorLevels: {}, rupees: 0 };

//typed store to help TS know the shape we'll call get/set
type StoreShape = {
  materials: Record<string, number>,
  armorLevels: Record<string, number>, //zod will guarantee our specific number set
  rupees: number
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
        materials: s.get('materials', {}),
        armorLevels: s.get('armorLevels', {}),
      };
      const parsed = OwnedStateSchema.safeParse({ ...current, rupees: 0 });
      s.clear();
      s.set(parsed.success ? parsed.data : DEFAULT_STATE);
    },
    '1.1.0': (s) => {
      const materials = s.get('materials', {});
      const armorLevels = s.get('armorLevels', {});
      const rupees = s.get('rupees') ?? 0;
      const parsed = OwnedStateSchema.safeParse({ materials, armorLevels, rupees });
      s.clear();
      s.set(parsed.success ? parsed.data : DEFAULT_STATE);
    },
    '1.2.0': (s) => {
      const materials = s.get('materials', {}) as Record<string, number>;
      const rupees = (s.get('rupees') ?? 0) as number;
      const currentLevels = s.get('armorLevels', {}) as Record<string, number>;

      const nextLevels: Record<string, number> = {};

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
        if (!(armorId in nextLevels)) nextLevels[armorId] = 0;
      }

      //validate and persist atomically
      const parsed = OwnedStateSchema.safeParse({
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
      },
      rupees: (store.get('rupees') ?? 0) + (patch.rupees ?? 0)
    };
    const next = OwnedStateSchema.parse(merged);
    store.set(next);
    return next;
  },

  //replace only rupees value
  setRupees(amount: number): OwnedState {
    const current = this.getState();
    const next = OwnedStateSchema.parse({
      materials: current.materials,
      armorLevels: current.armorLevels,
      rupees: amount //zod will coerce and enforce non-negative int
    });
    store.set(next); //atomic wrhite
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
  },

  /** reset to catalog defaults (armor 0 for all known ids, empty materials, rupees 0) */
  resetToDefaults(): OwnedState {
    //build a seeded armorLevels map from catalog
    const seededLevels: Record<string, number> = Object.fromEntries(armorPieces.map(p => [p.id, 0]));
    const next: OwnedState = { materials: {}, armorLevels: seededLevels, rupees: 0 };
    const valid = OwnedStateSchema.parse(next);
    store.clear();
    store.set(valid);
    return valid;
  }
};
