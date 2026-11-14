import { useHotkeys } from 'react-hotkeys-hook';
import { Outlet } from 'react-router';
import { useTaskDetailPrefetch } from '../api/taskDetail';
import { useKeybindingsStore } from '../store/keybindings';
import { useUiStore } from '../store/ui';
import { AssistantFab } from './AssistantFab';
import { CaptureDialog } from './CaptureDialog';
import { ChatDrawer } from './ChatDrawer';
import { CommandPalette } from './CommandPalette';
import { ConfirmDialog } from './ConfirmDialog';
import { MobileTabBar } from './MobileTabBar';
import { NavHotkeys } from './NavHotkeys';
import { NoticeOverlay } from './NoticeOverlay';
import { ProjectDialog } from './ProjectDialog';
import { ProposalModal } from './ProposalModal';
import { ScrollToTopButton } from './ScrollToTopButton';
import { ShortcutHelpDialog } from './ShortcutHelpDialog';
import { Sidebar } from './Sidebar';
import { TaskDrawer } from './TaskDrawer';
import { TopBarActions } from './TopBarActions';
import { TooltipLayer } from './TooltipLayer';
import { UndoBar } from './UndoBar';

export function AppShell() {
  useTaskDetailPrefetch();
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const openChat = useUiStore((state) => state.openChat);
  const toggleSidebarKey = useKeybindingsStore((s) => s.bindings.toggleSidebar ?? 'x');
  const askAssistantKey = useKeybindingsStore((s) => s.bindings.askAssistant ?? 'ctrl+a');
  const askAssistantIsSelectAll = /^(ctrl|mod|meta)\+a$/.test(askAssistantKey);

  // Bare keys stay inert inside form fields, so typing "x" never collapses the
  // sidebar mid-sentence.
  useHotkeys(
    toggleSidebarKey,
    () => {
      toggleSidebar();
    },
    { preventDefault: true },
  );

  // The assistant opens from anywhere, including while another field has focus,
  // unless the binding is a select-all combo that text fields need for themselves.
  useHotkeys(
    askAssistantKey,
    () => {
      openChat();
    },
    { preventDefault: true, enableOnFormTags: !askAssistantIsSelectAll },
    [askAssistantIsSelectAll],
  );

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      {/* Sidebar: hidden on mobile, visible from sm up */}
      <div className="hidden sm:block sm:shrink-0">
        <Sidebar />
      </div>

      <TopBarActions />

      {/* Main content */}
      <main className="min-w-0 flex-1 overflow-x-hidden pt-2 pr-4 pb-20 pl-4 sm:pt-5 sm:pr-36 sm:pb-10 sm:pl-6 lg:pt-6 lg:pr-36 lg:pl-8">
        <UndoBar />
        <Outlet />
      </main>

      {/* Bottom tab bar on mobile only */}
      <MobileTabBar />
      <NavHotkeys />
      <ScrollToTopButton />
      <AssistantFab />

      <CaptureDialog />
      <ChatDrawer />
      <TaskDrawer />
      <ProjectDialog />
      <ProposalModal />
      <ShortcutHelpDialog />
      <CommandPalette />
      <ConfirmDialog />
      <NoticeOverlay />
      <TooltipLayer />
    </div>
  );
}
