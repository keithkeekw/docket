import { APP_NAME } from '@app/shared';
import { useEffect, useState } from 'react';
import { PrelineInit } from './components/PrelineInit';

type HealthState =
  | { status: 'loading' }
  | { status: 'ok'; app: string; time: string }
  | { status: 'error'; message: string };

/**
 * M1-S1 placeholder. Proves the workspace wiring end to end: React renders, the
 * Tailwind tokens apply, and `/api/health` reaches the Hono server through the
 * Vite proxy. Replaced by the app shell in M1-S4.
 */
export default function App() {
  const [health, setHealth] = useState<HealthState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/health', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { app: string; time: string };
      })
      .then((data) => {
        setHealth({ status: 'ok', app: data.app, time: data.time });
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
    <div className="min-h-full bg-zinc-50">
      <PrelineInit />
      <main className="mx-auto flex min-h-full max-w-[1120px] flex-col justify-center px-8 py-6">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="size-[22px] rounded-md bg-zinc-900" />
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{APP_NAME}</h1>
        </div>
        <p className="mt-2 text-sm text-zinc-600">Workspace setup · M1-S1</p>

        <section className="mt-8 max-w-[560px] rounded-xl border border-zinc-200 bg-white px-5 py-4">
          <h2 className="text-[15px] font-semibold text-zinc-900">Local API</h2>
          <p className="mt-2 text-sm text-zinc-700" role="status">
            {health.status === 'loading' && 'Checking /api/health…'}
            {health.status === 'ok' &&
              `Server: ok · ${health.app} · ${new Date(health.time).toLocaleTimeString()}`}
            {health.status === 'error' && `Server unreachable: ${health.message}`}
          </p>
          <p className="mt-2 text-xs text-zinc-500">Web 127.0.0.1:5173 → API 127.0.0.1:8787</p>
        </section>
      </main>
    </div>
  );
}
