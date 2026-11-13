import { Outlet } from 'react-router';
import { CaptureDialog } from './CaptureDialog';
import { ChatDrawer } from './ChatDrawer';
import { ProjectDialog } from './ProjectDialog';
import { ProposalModal } from './ProposalModal';
import { Sidebar } from './Sidebar';
import { TaskDrawer } from './TaskDrawer';
import { UndoBar } from './UndoBar';

/**
 * DESIGN §3 app shell: sidebar + main content in a wrapping flex row.
 * `min-w-0` on the main column is what lets long task titles truncate instead
 * of pushing the layout wider than the viewport.
 *
 * The capture, task and project dialogs live here so they are mounted once
 * and can be opened from any screen.
 */
export function AppShell() {
  return (
    <div className="flex min-h-full flex-col min-[900px]:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 bg-white/60 px-8 pt-6 pb-12">
        <UndoBar />
        <Outlet />
      </main>
      <CaptureDialog />
      <ChatDrawer />
      <TaskDrawer />
      <ProjectDialog />
      <ProposalModal />
    </div>
  );
}
