import { useEffect, useMemo, useState } from 'react';
import { DockLauncher } from '../lib/types';

type CenterView = 'editor' | 'logic_sheet' | 'ai_workspace';

interface ForgeDockProps {
  activeView: CenterView;
  aiPanelOpen: boolean;
  launchers: DockLauncher[];
  onLaunchLauncher: (launcher: DockLauncher, options?: { openInNewWindow?: boolean }) => void;
  onUpdateLauncher: (id: string, updates: Partial<DockLauncher>) => void;
  onRemoveLauncher: (id: string) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  launcherId: string;
}

const ForgeDock = ({
  activeView,
  aiPanelOpen,
  launchers,
  onLaunchLauncher,
  onUpdateLauncher,
  onRemoveLauncher,
}: ForgeDockProps) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const pinnedLaunchers = useMemo(
    () => launchers.filter((launcher) => launcher.pinned),
    [launchers]
  );

  const activeLauncher = contextMenu
    ? launchers.find((launcher) => launcher.id === contextMenu.launcherId) || null
    : null;

  useEffect(() => {
    if (!contextMenu) return;

    const close = () => setContextMenu(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };

    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [contextMenu]);

  const isActive = (launcher: DockLauncher): boolean => {
    if (launcher.type !== 'internal') return false;
    if (launcher.target === 'ai_panel') {
      return aiPanelOpen;
    }
    return activeView === launcher.target;
  };

  return (
    <>
      <div className="h-12 border-t border-forge-steel bg-[#101010] px-2 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {pinnedLaunchers.map((launcher) => (
          <button
            key={launcher.id}
            onClick={() => onLaunchLauncher(launcher)}
            onContextMenu={(event) => {
              event.preventDefault();
              setContextMenu({
                x: event.clientX,
                y: event.clientY,
                launcherId: launcher.id,
              });
            }}
            className={`text-[10px] px-2 py-1 rounded border cursor-pointer flex items-center gap-1 whitespace-nowrap ${
              isActive(launcher)
                ? 'border-forge-ember/50 text-forge-ember bg-forge-ember/10'
                : 'border-forge-steel text-gray-300 hover:text-forge-ember'
            }`}
            title={`${launcher.name} (${launcher.type})`}
          >
            <span>{launcher.icon || '◻'}</span>
            <span>{launcher.name}</span>
          </button>
        ))}
      </div>

      {contextMenu && activeLauncher && (
        <div
          className="fixed z-[80] min-w-44 rounded border border-forge-steel bg-[#141414] shadow-2xl p-1"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 190),
            top: Math.min(contextMenu.y, window.innerHeight - 170),
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={() => {
              onUpdateLauncher(activeLauncher.id, { pinned: !activeLauncher.pinned });
              setContextMenu(null);
            }}
            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-forge-steel text-gray-200 cursor-pointer"
          >
            {activeLauncher.pinned ? 'Unpin' : 'Pin'}
          </button>

          <button
            onClick={() => {
              const renamed = prompt('Rename launcher:', activeLauncher.name);
              if (renamed && renamed.trim()) {
                onUpdateLauncher(activeLauncher.id, { name: renamed.trim() });
              }
              setContextMenu(null);
            }}
            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-forge-steel text-gray-200 cursor-pointer"
          >
            Rename
          </button>

          <button
            onClick={() => {
              onLaunchLauncher(activeLauncher, { openInNewWindow: true });
              setContextMenu(null);
            }}
            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-forge-steel text-gray-200 cursor-pointer"
          >
            Open In New Window
          </button>

          <button
            disabled={Boolean(activeLauncher.core)}
            onClick={() => {
              if (!activeLauncher.core) {
                onRemoveLauncher(activeLauncher.id);
              }
              setContextMenu(null);
            }}
            className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-forge-steel text-red-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Remove
          </button>
        </div>
      )}
    </>
  );
};

export default ForgeDock;
