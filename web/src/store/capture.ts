import { create } from 'zustand';

const STORAGE_KEY = 'docket:capture-multiple';

function loadMultiple(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

type CaptureStore = {
  multiple: boolean;
  setMultiple: (multiple: boolean) => void;
};

/** Quick Capture's "add multiple tasks" choice, persisted on this device. */
export const useCaptureStore = create<CaptureStore>((set) => ({
  multiple: loadMultiple(),
  setMultiple: (multiple) => {
    try {
      localStorage.setItem(STORAGE_KEY, multiple ? '1' : '0');
    } catch {
      // A blocked localStorage only costs persistence, not the checkbox.
    }
    set({ multiple });
  },
}));
