import { useEffect, useState } from 'react';

type HealthState =
  | { status: 'loading' }
  | { status: 'ok'; statuses: number }
  | { status: 'error'; message: string };

/**
 * Temporary M1-S3 status line. Proves the proxy and database are still wired
 * while the component gallery replaces the placeholder screen. Removed with the
 * app shell in M1-S4.
 */
export function ApiStatus() {
  const [health, setHealth] = useState<HealthState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/health', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as {
          database?: { ready?: boolean; statuses?: number };
        };
      })
      .then((data) => {
        const ready = data.database?.ready ?? false;
        const statuses = data.database?.statuses ?? 0;
        setHealth(
          ready
            ? { status: 'ok', statuses }
            : { status: 'error', message: 'database not migrated' },
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setHealth({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      });

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <p className="text-xs text-zinc-500" role="status">
      API:{' '}
      {health.status === 'loading' && 'checking…'}
      {health.status === 'ok' && `ok · database ready · ${health.statuses} statuses`}
      {health.status === 'error' && `unreachable (${health.message})`}
    </p>
  );
}
