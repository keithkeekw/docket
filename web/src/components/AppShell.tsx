import { useHotkeys } from 'react-hotkeys-hook';
import { Outlet } from 'react-router';
import { useKeybindingsStore } from '../store/keybindings';
import { useUiStore } from '../store/ui';
import { CaptureDialog } from './CaptureDialog';
import { ChatDrawer } from './ChatDrawer';
import { CommandPalette } from './CommandPalette';
import { MobileTabBar } from './MobileTabBar';
import { ProjectDialog } from './ProjectDialog';
import { ProposalModal } from './ProposalModal';
import { ShortcutHelpDialog } from './ShortcutHelpDialog';
import { Sidebar } from './Sidebar';
import { TaskDrawer } from './TaskDrawer';
import { UndoBar } from './UndoBar';

export function AppShell() {
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const openChat = useUiStore((state) => state.openChat);
  const toggleSidebarKey = useKeybindingsStore((s) => s.bindings.toggleSidebar ?? 'x');
  const askAssistantKey = useKeybindingsStore(
    (s) => s.bindings.askAssistant ?? 'ctrl+alt+shift+meta+a',
  );

  // Bare keys stay inert inside form fields, so typing "x" never collapses the
  // sidebar mid-sentence.
  useHotkeys(toggleSidebarKey, () => { toggleSidebar(); }, { preventDefault: true });

  // The assistant opens from anywhere, including while another field has focus.
  useHotkeys(
    askAssistantKey,
    () => { openChat(); },
    { preventDefault: true, enableOnFormTags: true },
  );

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      {/* Sidebar: hidden on mobile, visible from sm up */}
      <div className="hidden sm:block sm:shrink-0">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="min-w-0 flex-1 overflow-x-hidden px-4 pt-5 pb-20 sm:px-6 sm:pb-10 lg:px-8 lg:pt-6">
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
      <ShortcutHelpDialog />
      <CommandPalette />
    </div>
  );
}
