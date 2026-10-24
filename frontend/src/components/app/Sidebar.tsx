import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Plus, MoreHorizontal, ArrowDown, ArrowUp } from 'lucide-react';
import SidebarBoardList from './SidebarBoardList';
import SidebarCollapsible from './SidebarCollapsible';
import ShareInvitesList from '../sharing/ShareInvitesList';
import Avatar from '../sharing/Avatar';
import { useMyShares, useSharedWithMe, flattenShares } from '../../hooks/useSharing';
import { useUiStore } from '../../store/uiStore';
import BoardsModal from '../kanban/BoardsModal';

const COLLAPSE_KEY = 'tudu-sidebar-collapsed';

/**
 * The left sidebar.
 *
 * Replaces the previous SharedListsSidebar + BoardSelector pair: it now
 * hosts the board list (grouped by workspace), the three share sections,
 * and a jump-to-recent-activity link — matching the mockup exactly.
 */
const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [atRecent, setAtRecent] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* quota or private mode */
    }
  }, [collapsed]);

  // Track whether the main scroll pane is near the bottom, so the
  // "Recent activity" button toggles between jump-to and back-to-top.
  useEffect(() => {
    const main = document.querySelector<HTMLElement>('[data-main]');
    if (!main) return;
    const onScroll = () => {
      setAtRecent(main.scrollTop + main.clientHeight >= main.scrollHeight - 120);
    };
    main.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  const handleRecentActivity = () => {
    const main = document.querySelector<HTMLElement>('[data-main]');
    if (!main) return;
    if (atRecent) {
      main.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = document.getElementById('recent-activity');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else main.scrollTo({ top: main.scrollHeight, behavior: 'smooth' });
    }
  };

  const { data: sharedWithMe } = useSharedWithMe();
  const { data: myShares } = useMyShares();

  const pendingShares = flattenShares(sharedWithMe).filter((s) => s.status === 'pending');
  const acceptedShares = flattenShares(sharedWithMe).filter((s) => s.status === 'accepted');
  const sharedByMe = flattenShares(myShares);

  if (collapsed) {
    return (
      <aside
        data-tour="shared"
        className="hidden w-14 shrink-0 flex-col overflow-hidden rounded-xl border border-line-subtle bg-surface lg:flex"
      >
        <div className="flex h-12 shrink-0 items-center justify-center border-b border-line-subtle">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            title="Expand sidebar"
            aria-label="Expand sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-hidden">
          <SidebarBoardList collapsed />
        </div>
      </aside>
    );
  }

  return (
    <aside
      data-tour="shared"
      className="hidden w-64 shrink-0 flex-col overflow-hidden rounded-xl border border-line-subtle bg-surface lg:flex"
    >
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-line-subtle px-2">
        <span className="flex-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Boards
        </span>
        <button
          type="button"
          onClick={() => setManageOpen(true)}
          title="New / manage boards"
          aria-label="New or manage boards"
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setManageOpen(true)}
          title="Board actions"
          aria-label="Board actions"
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto scroll-hidden">
        <SidebarBoardList collapsed={false} />
        <SidebarCollapsible title="Invitations" badge={pendingShares.length} defaultOpen={pendingShares.length > 0}>
          <ShareInvitesList />
        </SidebarCollapsible>
        <SidebarCollapsible title="Shared with me" badge={acceptedShares.length} defaultOpen={acceptedShares.length > 0}>
          {acceptedShares.length === 0 ? (
            <p className="px-3 py-1 text-[11px] text-ink-faint">Nothing shared with you yet.</p>
          ) : (
            <ul className="space-y-1 px-2">
              {acceptedShares.map((share) => (
                <li key={share.id}>
                  <Link
                    to={`/shared/${share.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-subtle"
                  >
                    <Avatar user={share.owner} size="h-6 w-6" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] text-ink">
                        {share.owner?.name || share.owner?.email || 'Someone'}
                      </p>
                      <p className="truncate text-[10px] text-ink-faint">
                        {share.tasks_completed ?? 0}/{share.task_count ?? 0} done
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SidebarCollapsible>
        <SidebarCollapsible title="Shared by me" badge={sharedByMe.length} defaultOpen={false}>
          {sharedByMe.length === 0 ? (
            <p className="px-3 py-1 text-[11px] text-ink-faint">You have not shared anything yet.</p>
          ) : (
            <ul className="space-y-1 px-2">
              {sharedByMe.map((share) => (
                <li key={share.id}>
                  <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
                    <Avatar user={share.shared_with} size="h-6 w-6" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] text-ink">
                        {share.shared_with?.name || share.shared_with?.email || 'Someone'}
                      </p>
                      <p className="truncate text-[10px] uppercase text-ink-faint">
                        {share.status}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SidebarCollapsible>
        <button
          type="button"
          onClick={handleRecentActivity}
          className="flex w-full items-center gap-2 border-t border-line-subtle px-3 py-2 text-left transition-colors hover:bg-subtle/50"
        >
          {atRecent ? (
            <ArrowUp className="h-3 w-3 shrink-0 text-ink-faint" />
          ) : (
            <ArrowDown className="h-3 w-3 shrink-0 text-ink-faint" />
          )}
          <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Recent activity
          </span>
        </button>
      </div>
      {manageOpen && <BoardsModal onClose={() => setManageOpen(false)} />}
    </aside>
  );
};

export default Sidebar;
