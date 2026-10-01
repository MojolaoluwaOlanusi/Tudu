import { formatDistanceToNow } from 'date-fns';
import { Activity } from '../types/activity';

const STATUS_LABELS: Record<string, string> = {
  todo: 'To-do',
  doing: 'Doing',
  done: 'Done',
};

const statusLabel = (value?: string): string =>
  value ? STATUS_LABELS[value] ?? value : '';

const FIELD_LABELS: Record<string, string> = {
  title: 'title',
  description: 'description',
  category: 'category',
  priority: 'priority',
  due_date: 'due date',
  status: 'status',
};

/**
 * Turn a raw activity row into a friendly sentence, e.g.
 * "moved “Write docs” to Done" -> rendered as "You moved “Write docs” to Done".
 */
export const formatActivity = (activity: Activity): string => {
  const details = activity.details ?? {};
  const title = activity.task_title || details.title || 'a task';

  switch (activity.action) {
    case 'task_created':
      return `created “${title}”`;
    case 'task_updated': {
      const fields = (details.fields ?? []).map(
        (field) => FIELD_LABELS[field] ?? field
      );
      return `updated “${title}”${fields.length ? ` (${fields.join(', ')})` : ''}`;
    }
    case 'task_moved':
      return `moved “${title}” to ${statusLabel(details.to)}`;
    case 'task_completed':
      return `completed “${title}”`;
    case 'task_deleted':
      return `deleted “${title}”`;
    case 'subtask_created':
      return `added sub-task “${details.subtaskTitle ?? ''}” to “${title}”`;
    case 'subtask_completed':
      return `completed sub-task “${details.subtaskTitle ?? ''}” on “${title}”`;
    case 'subtask_updated':
      return `updated sub-task “${details.subtaskTitle ?? ''}” on “${title}”`;
    case 'subtask_deleted':
      return `removed a sub-task from “${title}”`;
    case 'list_shared':
      return `shared a list of ${details.taskCount ?? 0} task${
        (details.taskCount ?? 0) === 1 ? '' : 's'
      } with ${details.email ?? 'someone'}`;
    case 'share_accepted':
      return `accepted a shared list from ${details.email ?? 'someone'}`;
    case 'share_declined':
      return `declined a shared list from ${details.email ?? 'someone'}`;
    default:
      return (activity.action as string).replace(/_/g, ' ');
  }
};

/** "2 hours ago" */
export const relativeTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return formatDistanceToNow(date, { addSuffix: true });
};

/** Small coloured dot per action, so the feed is scannable. */
export const activityTone = (action: Activity['action']): string => {
  switch (action) {
    case 'task_completed':
    case 'subtask_completed':
    case 'share_accepted':
      return 'bg-accent';
    case 'task_deleted':
    case 'share_declined':
      return 'bg-red-400';
    case 'task_created':
    case 'subtask_created':
    case 'list_shared':
      return 'bg-blue-400';
    default:
      return 'bg-gray-400';
  }
};