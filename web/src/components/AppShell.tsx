import { Outlet } from 'react-router';
import { CaptureDialog } from './CaptureDialog';
import { ChatDrawer } from './ChatDrawer';
import { MobileTabBar } from './MobileTabBar';
import { ProjectDialog } from './ProjectDialog';
import { ProposalModal } from './ProposalModal';
import { Sidebar } from './Sidebar';
import { TaskDrawer } from './TaskDrawer';
import { UndoBar } from './UndoBar';

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      {/* Sidebar: hidden on mobile, visible from sm up */}
      <div className="hidden sm:block sm:shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="min-w-0 flex-1 px-4 pt-5 pb-20 sm:px-6 sm:pb-10 lg:px-8 lg:pt-6">
        <UndoBar />
        <Outlet />
      </main>

      {/* Bottom tab bar on mobile only */}
      <MobileTabBar />

      <CaptureDialog />
      <ChatDrawer />
      <TaskDrawer />
      <ProjectDialog />
      <ProposalModal />
    </div>
  );
}
