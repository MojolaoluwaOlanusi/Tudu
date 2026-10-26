import React, { useEffect, useState } from 'react';
import {
  PanelLeftClose, PanelLeftOpen, Plus, MoreHorizontal,
  Mail, Users, Send, ArrowUp, ArrowDown,
} from 'lucide-react';
import SidebarBoardList from './SidebarBoardList';
import SidebarCollapsible from './SidebarCollapsible';
import ShareInvitesList from '../sharing/ShareInvitesList';
import Avatar from '../sharing/Avatar';
import { useMyShares, useSharedWithMe, flattenShares } from '../../hooks/useSharing';
import { useUiStore } from '../../store/uiStore';
import BoardsModal from '../kanban/BoardsModal';

const COLLAPSE_KEY = 'tudu-sidebar-collapsed';

const iconBtn =
  'flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink';

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  const [atRecent, setAtRecent] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch {}
  }, [collapsed]);

  useEffect(() => {
    const main = document.querySelector<HTMLElement>('[data-main]');
    if (!main) return;

    const update = () => {
      const maxScroll = main.scrollHeight - main.clientHeight;
      // Content fits inside the viewport: there is nowhere to scroll, so
      // never claim the user is "at recent activity" - the arrow should
      // point down (its actual job is a no-op in this case).
      if (maxScroll <= 4) {
        setAtRecent(false);
        return;
      }
      // Near the bottom. Cap the tolerance at 120px, but for pages that
      // only overflow by a little, scale it so a barely-scrolling list
      // does not report "at the bottom" while the user is at the top.
      const threshold = Math.min(120, maxScroll / 2);
      setAtRecent(main.scrollTop >= maxScroll - threshold);
    };

    main.addEventListener('scroll', update, { passive: true });

    // React Query fills the page after mount, and fonts/images change
    // layout. In all three cases scrollHeight changes without a scroll
    // event, so the arrow used to get stuck in the wrong direction until
    // the user scrolled manually. Observe both the scroll container (its
    // clientHeight changes on viewport resize) and its content wrapper
    // (its height grows with children, which is what changes scrollHeight).
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (ro) {
      const wrapper = main.firstElementChild;
      if (wrapper) ro.observe(wrapper);
      ro.observe(main);
    }

    // Seed the state once, after the first paint has settled. rAF fires
    // after layout, so clientHeight and scrollHeight are already correct
    // for the initial content; the ResizeObserver covers growth after this.
    const raf = window.requestAnimationFrame(update);

    return () => {
      main.removeEventListener('scroll', update);
      ro?.disconnect();
      window.cancelAnimationFrame(raf);
    };
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

  const withMe = flattenShares(sharedWithMe);
  const pendingShares = withMe.filter((s) => s.status === 'pending');
  const acceptedShares = withMe.filter((s) => s.status === 'accepted');
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
            className={iconBtn}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-hidden">
          <SidebarBoardList collapsed />
          <div className="my-2 border-t border-line-subtle" />
          <div className="flex flex-col items-center gap-1 px-2 py-1">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              title={'Invitations (' + pendingShares.length + ')'}
              aria-label={'Invitations (' + pendingShares.length + ')'}
              className={'relative ' + iconBtn}
            >
              <Mail className="h-4 w-4" />
              {pendingShares.length > 0 && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              title={'Shared with me (' + acceptedShares.length + ')'}
              aria-label={'Shared with me (' + acceptedShares.length + ')'}
              className={'relative ' + iconBtn}
            >
              <Users className="h-4 w-4" />
              {acceptedShares.length > 0 && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              title={'Shared by me (' + sharedByMe.length + ')'}
              aria-label={'Shared by me (' + sharedByMe.length + ')'}
              className={iconBtn}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="my-2 border-t border-line-subtle" />
          <div className="flex justify-center px-2">
            <button
              type="button"
              onClick={handleRecentActivity}
              title={atRecent ? 'Back to top' : 'Jump to recent activity'}
              aria-label={atRecent ? 'Back to top' : 'Jump to recent activity'}
              className={iconBtn}
            >
              {atRecent ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </button>
          </div>
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
          className={iconBtn + ' !h-7 !w-7'}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setManageOpen(true)}
          title="Board actions"
          aria-label="Board actions"
          className={iconBtn + ' !h-7 !w-7'}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
          className={iconBtn + ' !h-7 !w-7'}
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
                  <a
                    href={`#/shared/${share.id}`}
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
                  </a>
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
                      <p className="truncate text-[10px] uppercase text-ink-faint">{share.status}</p>
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
