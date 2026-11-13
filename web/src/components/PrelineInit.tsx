import { useEffect } from 'react';

/**
 * Preline UI ships plain-DOM plugins, so they must be initialised after React
 * has rendered the elements they attach to. Route-aware re-initialisation
 * arrives with the router in M1-S4.
 */
export function PrelineInit() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { HSStaticMethods } = await import('preline/non-auto');
      if (cancelled) return;
      HSStaticMethods.cleanCollection();
      HSStaticMethods.autoInit();
    })().catch((error: unknown) => {
      console.error('Failed to initialise Preline UI', error);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
