import { create } from 'zustand';

const STORAGE_KEY = 'docket:sidebar-projects-collapsed';

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

type SidebarSectionsStore = {
  projectsCollapsed: boolean;
  toggleProjects: () => void;
};

/** Whether the sidebar's Projects list is folded away, persisted on this device. */
export const useSidebarSectionsStore = create<SidebarSectionsStore>((set, get) => ({
  projectsCollapsed: loadCollapsed(),
  toggleProjects: () => {
    const projectsCollapsed = !get().projectsCollapsed;
    try {
      localStorage.setItem(STORAGE_KEY, projectsCollapsed ? '1' : '0');
    } catch {
      // A blocked localStorage only costs persistence, not the toggle.
    }
    set({ projectsCollapsed });
  },
}));
