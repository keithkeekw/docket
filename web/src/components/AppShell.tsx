import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';

/**
 * DESIGN §3 app shell: sidebar + main content in a wrapping flex row.
 * `min-w-0` on the main column is what lets long task titles truncate instead
 * of pushing the layout wider than the viewport.
 */
export function AppShell() {
  return (
    <div className="flex min-h-full flex-col bg-zinc-50 min-[900px]:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 px-8 pt-6 pb-12">
        <Outlet />
      </main>
    </div>
  );
}
