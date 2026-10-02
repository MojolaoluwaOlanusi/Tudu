/**
 * Unit tests for the analytics aggregation logic.
 *
 * The pool is mocked, so these assert the bucketing and timezone maths that
 * phase 16 actually got wrong - duplicated weekly keys, and rows that never
 * matched their bucket.
 */
const query = jest.fn();

jest.mock('../../src/config/database', () => ({
  __esModule: true,
  default: { query: (...args: unknown[]) => query(...args) },
}));

import {
  parseRange,
  RANGE_SPECS,
  utcToLocalShift,
  localToUtcShift,
  getOverview,
  getCompletedTasks,
  getTimeSpent,
} from '../../src/services/analyticsService';

const USER = '11111111-1111-4111-8111-111111111111';

const overviewRow = (over: Partial<Record<string, number>> = {}) => ({
  total: 0,
  todo: 0,
  doing: 0,
  done: 0,
  overdue: 0,
  p_high: 0,
  p_medium: 0,
  p_low: 0,
  p_none: 0,
  c_work: 0,
  c_personal: 0,
  c_study: 0,
  c_none: 0,
  ...over,
});

beforeEach(() => {
  query.mockReset();
});

describe('parseRange', () => {
  it('accepts the three supported ranges', () => {
    expect(parseRange('week')).toBe('week');
    expect(parseRange('month')).toBe('month');
    expect(parseRange('quarter')).toBe('quarter');
  });

  it('falls back to week for anything unrecognised', () => {
    expect(parseRange('year')).toBe('week');
    expect(parseRange(undefined)).toBe('week');
    expect(parseRange(null)).toBe('week');
    expect(parseRange(42)).toBe('week');
  });
});

describe('range specs', () => {
  it('buckets by day for week and month, by week for quarter', () => {
    expect(RANGE_SPECS.week.granularity).toBe('day');
    expect(RANGE_SPECS.month.granularity).toBe('day');
    expect(RANGE_SPECS.quarter.granularity).toBe('week');
  });

  it('keeps the window and the bucket count in step', () => {
    expect(RANGE_SPECS.week.buckets).toBe(7);
    expect(RANGE_SPECS.month.buckets).toBe(30);
    expect(RANGE_SPECS.quarter.buckets).toBe(12);
    expect(RANGE_SPECS.quarter.periodDays).toBe(RANGE_SPECS.quarter.buckets * 7);
  });
});

describe('timezone shifts', () => {
  it('shifts naive UTC timestamps forward into local wall clock time', () => {
    // getTimezoneOffset() is (UTC - local), so Lagos (UTC+1) is -60 and a
    // naive UTC stamp needs +60 minutes to become local.
    expect(utcToLocalShift(-60)).toBe('60 minutes');
    expect(utcToLocalShift(0)).toBe('0 minutes');
    expect(utcToLocalShift(330)).toBe('-330 minutes');
  });

  it('shifts naive local due_dates the other way, onto UTC', () => {
    expect(localToUtcShift(-60)).toBe('-60 minutes');
    expect(localToUtcShift(0)).toBe('0 minutes');
  });

  it('negates exactly, so the two directions never drift apart', () => {
    for (const offset of [-720, -60, 0, 60, 840]) {
      expect(utcToLocalShift(offset)).toBe(`${-offset} minutes`);
      expect(localToUtcShift(offset)).toBe(`${offset} minutes`);
    }
  });
});

describe('getOverview', () => {
  it('maps counts and derives the completion rate', async () => {
    query
      .mockResolvedValueOnce({
        rows: [overviewRow({ total: 5, todo: 2, doing: 1, done: 2, overdue: 1 })],
      })
      .mockResolvedValueOnce({ rows: [{ minutes: 125, sessions: 4 }] });

    const result = await getOverview(USER, 0);

    expect(result.tasks).toEqual({ total: 5, todo: 2, doing: 1, done: 2, overdue: 1 });
    expect(result.completionRate).toBe(40);
    expect(result.focus).toEqual({ minutes: 125, sessions: 4 });
  });

  it('reports 0% rather than NaN for an account with no tasks', async () => {
    query
      .mockResolvedValueOnce({ rows: [overviewRow({ total: 0 })] })
      .mockResolvedValueOnce({ rows: [{ minutes: 0, sessions: 0 }] });

    const result = await getOverview(USER, 0);

    expect(result.completionRate).toBe(0);
    expect(Number.isNaN(result.completionRate)).toBe(false);
  });
describe('getCompletedTasks', () => {
  const emptyPrevious = { rows: [{ count: 0 }] };
  const todayKey = () => new Date().toISOString().slice(0, 10);

  /** The Monday starting the week that today falls in. */
  const currentMonday = () => {
    const monday = new Date(`${todayKey()}T00:00:00.000Z`);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    return monday;
  };

  it('produces exactly seven distinct day buckets for the week range', async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce(emptyPrevious);

    const result = await getCompletedTasks(USER, 0, RANGE_SPECS.week);

    expect(result.buckets).toHaveLength(7);
    expect(new Set(result.buckets.map((b) => b.key)).size).toBe(7);
    expect(result.total).toBe(0);
  });

  /**
   * Regression: weekly buckets used to walk back a day at a time and floor to
   * the Monday, emitting the same week key seven times in a 12-week chart.
   */
  it('produces twelve distinct week buckets for the quarter range', async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce(emptyPrevious);

    const result = await getCompletedTasks(USER, 0, RANGE_SPECS.quarter);

    expect(result.buckets).toHaveLength(12);
    expect(new Set(result.buckets.map((b) => b.key)).size).toBe(12);
  });

  it('keys weekly buckets to the Monday that starts the week', async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce(emptyPrevious);

    const result = await getCompletedTasks(USER, 0, RANGE_SPECS.quarter);

    for (const bucket of result.buckets) {
      const day = new Date(`${bucket.key}T00:00:00.000Z`).getUTCDay();
      expect(day).toBe(1); // Monday
    }
  });

  /**
   * Regression: SQL grouped by the real completion date while the chart looked
   * values up by week start, so every weekly bar read zero.
   */
  it('folds mid-week completion dates onto their Monday bucket', async () => {
    const monday = currentMonday();
    const wednesday = new Date(monday.getTime());
    wednesday.setUTCDate(wednesday.getUTCDate() + 2);
    const mondayKey = monday.toISOString().slice(0, 10);

    query
      .mockResolvedValueOnce({
        rows: [
          { bucket: mondayKey, count: 2 },
          { bucket: wednesday.toISOString().slice(0, 10), count: 3 },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const result = await getCompletedTasks(USER, 0, RANGE_SPECS.quarter);

    expect(result.total).toBe(5);
    expect(result.buckets.find((b) => b.key === mondayKey)?.count).toBe(5);
  });

  it('leaves days with no activity at zero rather than dropping them', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ bucket: todayKey(), count: 1 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const result = await getCompletedTasks(USER, 0, RANGE_SPECS.week);

    expect(result.buckets).toHaveLength(7);
    expect(result.total).toBe(1);
    expect(result.buckets.filter((b) => b.count === 0)).toHaveLength(6);
  });

  it('reports null change when the previous period was empty', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ bucket: todayKey(), count: 4 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });

    const result = await getCompletedTasks(USER, 0, RANGE_SPECS.week);

    // Claiming "+Infinity%" or "0%" here would both be lies.
    expect(result.changePercent).toBeNull();
  });

  it('reports zero change when both periods are empty', async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce(emptyPrevious);

    const result = await getCompletedTasks(USER, 0, RANGE_SPECS.week);

    expect(result.changePercent).toBe(0);
  });

describe('getTimeSpent', () => {
  const totals = { rows: [{ minutes: 125, sessions: 4 }] };
  const emptyTotals = { rows: [{ minutes: 0, sessions: 0 }] };

  it('turns minutes into whole-number shares that sum to 100', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          { category: 'work', minutes: 75, sessions: 3 },
          { category: 'personal', minutes: 50, sessions: 1 },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(totals);

    const result = await getTimeSpent(USER, 0, RANGE_SPECS.month);

    const shares = result.byCategory.reduce((sum, c) => sum + c.share, 0);
    expect(shares).toBe(100);
    expect(result.byCategory[0]).toMatchObject({
      category: 'work',
      label: 'Work',
      minutes: 75,
      share: 60,
    });
  });

  it('labels uncategorised sessions rather than dropping them', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ category: 'none', minutes: 10, sessions: 1 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ minutes: 10, sessions: 1 }] });

    const result = await getTimeSpent(USER, 0, RANGE_SPECS.month);

    expect(result.byCategory[0].label).toBe('Uncategorised');
  });

  it('produces no slices when there is no focus time at all', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(emptyTotals);

    const result = await getTimeSpent(USER, 0, RANGE_SPECS.month);

    expect(result.totalMinutes).toBe(0);
    expect(result.byCategory).toEqual([]);
  });

  it('only counts completed sessions, never abandoned ones', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce(emptyTotals);

    await getTimeSpent(USER, 0, RANGE_SPECS.month);

    expect(query.mock.calls[0][0]).toContain('completed_at IS NOT NULL');
  });
});
  it('compares like for like against the previous period', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ bucket: todayKey(), count: 6 }] })
      .mockResolvedValueOnce({ rows: [{ count: 4 }] });

    const result = await getCompletedTasks(USER, 0, RANGE_SPECS.week);

    expect(result.changePercent).toBe(50);
  });

  it('highlights the busiest bucket only when something happened', async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce(emptyPrevious);

    const result = await getCompletedTasks(USER, 0, RANGE_SPECS.week);

    expect(result.bestBucket).toBeNull();
  });

  it('scopes the query to the caller', async () => {
    query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce(emptyPrevious);

    await getCompletedTasks(USER, 0, RANGE_SPECS.week);

    expect(query.mock.calls[0][0]).toContain('user_id = $1');
    expect(query.mock.calls[0][1]).toContain(USER);
  });
});

  it('buckets priorities and categories, counting unset separately', async () => {
    query
      .mockResolvedValueOnce({
        rows: [overviewRow({ total: 4, p_high: 1, p_none: 2, c_work: 2, c_none: 1 })],
      })
      .mockResolvedValueOnce({ rows: [{ minutes: 0, sessions: 0 }] });

    const result = await getOverview(USER, 0);

    expect(result.byPriority).toEqual({ high: 1, medium: 0, low: 0, none: 2 });
    expect(result.byCategory).toEqual({ work: 2, personal: 0, study: 0, none: 1 });
  });
});