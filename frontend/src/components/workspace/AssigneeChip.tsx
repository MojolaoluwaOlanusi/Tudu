import React from 'react';
import { useBoards } from '../../hooks/useBoards';
import { useAssignTask, useWorkspaceMembers } from '../../hooks/useWorkspaces';
import { useUiStore } from '../../store/uiStore';
import type { Task } from '../../types/task';

/**
 * Who a card is assigned to. Renders nothing on personal boards.
 * Members and admins get a picker; viewers just see the name.
 */
const AssigneeChip: React.FC<{ task: Task }> = ({ task }) => {
  const { data: boards } = useBoards();
  const board = boards?.find((b) => b.id === task.board_id);
  const workspaceId = board?.workspace_id ?? null;
  const { data: members } = useWorkspaceMembers(workspaceId);
  const assign = useAssignTask();
  const pushToast = useUiStore((s) => s.pushToast);

  if (!workspaceId) return null;

  const people = (members ?? []).filter((m) => m.status === 'accepted');
  const current = people.find((m) => m.id === task.assignee_id);
  const canEdit = board?.role === 'admin' || board?.role === 'member';

  if (!canEdit) {
    return current ? (
      <p className="mt-2 text-[10px] font-medium text-ink-muted">
        Assigned to {current.name ?? current.email}
      </p>
    ) : null;
  }

  return (
    <label className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-ink-muted">
      Assignee
      <select
        value={task.assignee_id ?? ''}
        aria-label={`Assignee of ${task.title}`}
        disabled={assign.isPending}
        onChange={(event) =>
          assign.mutate(
            { taskId: task.id, assigneeId: event.target.value || null },
            {
              onError: (err) =>
                pushToast(
                  (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
                    'Could not assign the task',
                  'error'
                ),
            }
          )
        }
        className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-1.5 py-1 text-[11px] text-ink"
      >
        <option value="">Unassigned</option>
        {people
          .filter((m) => m.role !== 'viewer')
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.name ?? m.email}
            </option>
          ))}
      </select>
    </label>
  );
};

export default AssigneeChip;
