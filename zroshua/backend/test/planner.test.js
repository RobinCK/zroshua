const assert = require('node:assert/strict');
const test = require('node:test');
const { occurrences } = require('../dist/engine/planner');

const at = (year, month, day, hour = 0) => new Date(year, month - 1, day, hour).getTime();

test('runs an interval schedule by calendar-day distance from its anchor', () => {
  const entity = {
    id: 'beds',
    enabled: true,
    schedules: [{
      id: 'alternate',
      mode: 'interval',
      intervalDays: 2,
      anchorDate: '2026-01-01',
      weekdays: [],
      starts: [{ start: '06:00' }],
      perDay: {},
      enabled: true,
    }],
  };

  assert.deepEqual(
    occurrences(entity, at(2026, 1, 1), at(2026, 1, 7)).map((x) => new Date(x.ts).getDate()),
    [1, 3, 5],
  );

  entity.schedules[0].intervalDays = 3;
  entity.schedules[0].anchorDate = '2026-01-30';
  assert.deepEqual(
    occurrences(entity, at(2026, 1, 30), at(2026, 2, 8)).map((x) => {
      const d = new Date(x.ts);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }),
    ['2026-01-30', '2026-02-02', '2026-02-05'],
  );
});
