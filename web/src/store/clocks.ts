import { create } from 'zustand';

export const MAX_CLOCKS = 3;
const STORAGE_KEY = 'docket:clocks';

export type AddClockResult = 'added' | 'invalid' | 'duplicate' | 'limit';

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone }).format();
    return true;
  } catch {
    return false;
  }
}

function loadZones(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === 'string')
      .filter(isValidTimeZone)
      .filter((zone, index, all) => all.indexOf(zone) === index)
      .slice(0, MAX_CLOCKS);
  } catch {
    return [];
  }
}

function saveZones(zones: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(zones));
  } catch {
    // A blocked localStorage only costs persistence, not the clocks.
  }
}

type ClocksStore = {
  zones: string[];
  addZone: (zone: string) => AddClockResult;
  removeZone: (zone: string) => void;
};

export const useClocksStore = create<ClocksStore>((set, get) => ({
  zones: loadZones(),
  addZone: (zone) => {
    const trimmed = zone.trim();
    if (!isValidTimeZone(trimmed)) return 'invalid';

    const current = get().zones;
    if (current.includes(trimmed)) return 'duplicate';
    if (current.length >= MAX_CLOCKS) return 'limit';

    const next = [...current, trimmed];
    saveZones(next);
    set({ zones: next });
    return 'added';
  },
  removeZone: (zone) => {
    const next = get().zones.filter((entry) => entry !== zone);
    saveZones(next);
    set({ zones: next });
  },
}));
