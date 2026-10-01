import type {
  AnalyticsOverview,
  AnalyticsRange,
  CompletedTasksAnalytics,
  TimeSpentAnalytics,
} from '../types/analytics';

/**
 * A cell that a spreadsheet would treat as a formula. Task titles are
 * user-supplied and come straight back from the API, so an unescaped `=`
 * would run as code when the exported file is opened in Excel or Sheets.
 */
const escapeCell = (value: unknown): string => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
};

const toCsv = (rows: (string | number | null)[][]): string =>
  rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');

const humaniseMinutes = (minutes: number): string => {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};

const triggerDownload = (filename: string, contents: string, mime: string) => {
  // A BOM makes Excel open UTF-8 CSVs without mangling non-ASCII titles.
  const blob = new Blob([`\uFEFF${contents}`], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const todayStamp = (): string => new Date().toISOString().slice(0, 10);

export const exportAnalyticsCsv = (data: {
  range: AnalyticsRange;
  overview: AnalyticsOverview;
  completed: CompletedTasksAnalytics;
  timeSpent: TimeSpentAnalytics;
}): void => {
  const { range, overview, completed, timeSpent } = data;
  const rows: (string | number | null)[][] = [];

  rows.push(['Tudu analytics export']);
  rows.push(['Range', range]);
  rows.push(['Exported', new Date().toISOString()]);
  rows.push([]);

  rows.push(['Overview']);
  rows.push(['Total tasks', overview.tasks.total]);
  rows.push(['Completed', overview.tasks.done]);
  rows.push(['In progress', overview.tasks.doing]);
  rows.push(['To do', overview.tasks.todo]);
  rows.push(['Overdue', overview.tasks.overdue]);
  rows.push(['Completion rate', `${overview.completionRate}%`]);
  rows.push(['Focus minutes', overview.focus.minutes]);
  rows.push(['Focus sessions', overview.focus.sessions]);
  rows.push([]);

  rows.push(['Tasks by priority']);
  rows.push(['High', overview.byPriority.high]);
  rows.push(['Medium', overview.byPriority.medium]);
  rows.push(['Low', overview.byPriority.low]);
  rows.push(['Unset', overview.byPriority.none]);
  rows.push([]);

  rows.push(['Tasks by category']);
  rows.push(['Work', overview.byCategory.work]);
  rows.push(['Personal', overview.byCategory.personal]);
  rows.push(['Study', overview.byCategory.study]);
  rows.push(['Uncategorised', overview.byCategory.none]);
  rows.push([]);

  rows.push([`Completions (${completed.granularity})`]);
  rows.push(['Period start', completed.buckets[0]?.key ?? '']);
  rows.push(['Period end', completed.buckets[completed.buckets.length - 1]?.key ?? '']);
  rows.push(['Completed in period', completed.total]);
  rows.push(['Previous period', completed.previousTotal]);
  rows.push([]);
  rows.push(['Bucket', 'Label', 'Completed']);
  for (const bucket of completed.buckets) {
    rows.push([bucket.key, bucket.label, bucket.count]);
  }
  rows.push([]);

  rows.push(['Time spent by category']);
  rows.push(['Category', 'Minutes', 'Humanised', 'Sessions', 'Share']);
  for (const slice of timeSpent.byCategory) {
    rows.push([
      slice.label,
      slice.minutes,
      humaniseMinutes(slice.minutes),
      slice.sessions,
      `${slice.share}%`,
    ]);
  }
  rows.push([]);
  rows.push(['Time spent by task']);
  rows.push(['Task', 'Minutes', 'Humanised', 'Sessions']);
  for (const row of timeSpent.byTask) {
    rows.push([
      row.title ?? 'No task',
      row.minutes,
      humaniseMinutes(row.minutes),
      row.sessions,
    ]);
  }

  triggerDownload(
    `tudu-analytics-${range}-${todayStamp()}.csv`,
    toCsv(rows),
    'text/csv;charset=utf-8;'
  );
};

export const exportAnalyticsJson = (data: {
  range: AnalyticsRange;
  overview: AnalyticsOverview;
  completed: CompletedTasksAnalytics;
  timeSpent: TimeSpentAnalytics;
}): void => {
  triggerDownload(
    `tudu-analytics-${data.range}-${todayStamp()}.json`,
    JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2),
    'application/json;charset=utf-8;'
  );
};