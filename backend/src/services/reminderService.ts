import pool from '../config/database';
import { sendHtml } from './emailService';
import { sendPushToUsers } from './pushService';

export interface ReminderRunResult {
  usersChecked: number;
  emailsSent: number;
  emailsFailed: number;
  skipped: number;
}

/**
 * The shape returned by the query below.
 *
 * tasks is aggregated as a JSON array per user in one query, so a user
 * with 12 overdue tasks costs the database one row, not twelve.
 */
interface UserWithTasks {
  id: string;
  email: string;
  name: string | null;
  tasks: Array<{
    id: string;
    title: string;
    due_date: string;
    status: string;
    priority: string | null;
  }>;
}

/**
 * Users who want reminders and have at least one task due today or overdue.
 *
 * `notifications->>'reminders'` is a string comparison, not a boolean, so
 * the value is checked against 'true'. The last_sent_at guard makes the
 * endpoint idempotent for a 24-hour window: a cron that fires twice, or a
 * manual trigger for debugging, will not double-email a user.
 */
const findCandidates = async (): Promise<UserWithTasks[]> => {
  const result = await pool.query(
    'SELECT u.id, u.email, u.name, ' +
      '  json_agg(json_build_object( ' +
      '    \'id\', t.id, \'title\', t.title, ' +
      '    \'due_date\', t.due_date, \'status\', t.status, ' +
      '    \'priority\', t.priority ' +
      '  ) ORDER BY t.due_date ASC) AS tasks ' +
      'FROM users u ' +
      'JOIN tasks t ON t.user_id = u.id ' +
      'WHERE u.notifications->>\'reminders\' = \'true\' ' +
      '  AND t.deleted_at IS NULL ' +
      '  AND t.status <> \'done\' ' +
      '  AND t.due_date IS NOT NULL ' +
      '  AND t.due_date <= NOW() + INTERVAL \'24 hours\' ' +
      '  AND ( ' +
      '    u.notifications->>\'last_sent_at\' IS NULL ' +
      '    OR (u.notifications->>\'last_sent_at\')::timestamptz < NOW() - INTERVAL \'20 hours\' ' +
      '  ) ' +
      'GROUP BY u.id, u.email, u.name'
  );
  return result.rows;
};

/** Newline character. Used when joining the plain-text email body. */
const NL = String.fromCharCode(10);

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatDue = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'soon';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};

/**
 * Builds the reminder email. Kept inline rather than in a React Email
 * template because the styling is minimal and a TSX file would drag a
 * build step into the backend for one message.
 */
const buildReminderEmail = (user: UserWithTasks, appUrl: string) => {
  const total = user.tasks.length;
  const first = user.tasks[0];
  const subject =
    total === 1
      ? 'Reminder: ' + first.title
      : 'You have ' + total + ' tasks due soon';

  const rows = user.tasks
    .slice(0, 15)
    .map((t) => {
      const overdue = new Date(t.due_date).getTime() < Date.now();
      const colour = overdue ? '#dc2626' : '#64748b';
      const label = overdue ? 'Overdue' : 'Due ' + formatDue(t.due_date);
      return (
        '<tr>' +
        '<td style="padding:8px 0;border-bottom:1px solid #e2e8f0">' +
        '<div style="font-weight:600;color:#0f172a">' + escapeHtml(t.title) + '</div>' +
        '<div style="font-size:12px;color:' + colour + '">' + escapeHtml(label) + '</div>' +
        '</td>' +
        '</tr>'
      );
    })
    .join('');

  const more =
    total > 15
      ? '<p style="color:#64748b;font-size:13px">...and ' + (total - 15) + ' more.</p>'
      : '';

  const greeting = user.name ? 'Hi ' + escapeHtml(user.name) + ',' : 'Hi,';

  const html =
    '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">' +
    '<h1 style="font-size:20px;margin:0 0 8px">' + greeting + '</h1>' +
    '<p style="color:#475569;margin:0 0 20px">' +
    (total === 1 ? 'One task needs your attention.' : total + ' tasks need your attention.') +
    '</p>' +
    '<table style="width:100%;border-collapse:collapse">' + rows + '</table>' +
    more +
    '<p style="margin:28px 0 0">' +
    '<a href="' + appUrl + '/" style="display:inline-block;background:#22c55e;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:24px;font-weight:600">Open Tudu</a>' +
    '</p>' +
    '<p style="color:#94a3b8;font-size:12px;margin-top:32px">' +
    'You are receiving this because due-date reminders are on. ' +
    'Turn them off in Settings.' +
    '</p>' +
    '</div>';

  const text =
    greeting + NL + NL +
    (total === 1 ? 'One task needs your attention:' : total + ' tasks need your attention:') +
    NL + NL +
    user.tasks
      .slice(0, 15)
      .map((t) => '- ' + t.title + ' (' + formatDue(t.due_date) + ')')
      .join(NL) +
    NL + NL +
    'Open Tudu: ' + appUrl;

  return { subject, html, text };
};

/**
 * The whole job: find candidates, send one email each, record the send.
 *
 * Sequential rather than parallel on purpose. Resend rate-limits per
 * second, and reminder volumes are small enough that a loop costs
 * nothing. If it ever grows, a p-limit of 5 is the next step.
 */
export const runReminders = async (): Promise<ReminderRunResult> => {
  const candidates = await findCandidates();
  const appUrl = process.env.APP_URL ?? 'https://tudu-kanban.vercel.app';

  let sent = 0;
  let failed = 0;

  for (const user of candidates) {
    const { subject, html, text } = buildReminderEmail(user, appUrl);
    const result = await sendHtml({ to: user.email, subject, html, text });

    if (result.ok) {
      sent += 1;
      await pool.query(
        'UPDATE users SET notifications = COALESCE(notifications, \'{}\'::jsonb) || ' +
          'jsonb_build_object(\'last_sent_at\', NOW()) WHERE id = $1',
        [user.id]
      );
    } else {
      failed += 1;
      console.error('Reminder send failed for ' + user.email + ': ' + result.error);
    }
  }

  // Push runs alongside the email loop, not inside it. The two
  // channels are independent: a user can have email on and push off,
  // or the other way round, and a push failure must never fail the
  // email run.
  if (candidates.length > 0) {
    const pushSummary = await sendPushToUsers(
      candidates.map((c) => c.id),
      {
        title: 'Your Tudu tasks',
        body:
          candidates.length === 1
            ? 'One task needs your attention.'
            : 'You have tasks due soon.',
        tag: 'tudu-due-reminder',
        url: '/',
      }
    );
    if (pushSummary.delivered > 0 || pushSummary.pruned > 0) {
      console.log(
        '[push] delivered ' +
          pushSummary.delivered +
          ', pruned ' +
          pushSummary.pruned +
          ', failed ' +
          pushSummary.failed,
      );
    }
  }

  return {
    usersChecked: candidates.length,
    emailsSent: sent,
    emailsFailed: failed,
    skipped: 0,
  };
};
