export const RUPEES_BY_LEVEL = {
  1: 10,
  2: 50,
  3: 200,
  4: 500,
} as const;

export type RupeesByLevel = typeof RUPEES_BY_LEVEL; // {1:10,2:50,3:200,4:500}

export function rupeesForLevel<L extends keyof RupeesByLevel & number>(level: L) {
  return RUPEES_BY_LEVEL[level];
}
