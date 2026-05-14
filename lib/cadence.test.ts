import { describe, it, expect } from 'vitest';
import {
  buildCadenceGrid,
  detectMissedCheckins,
  getCadenceStatus,
  CADENCE_TARGET_COOKS,
} from '@/lib/cadence';

// Jestha 2083 starts on 2026-05-15 (Jestha 1). The month has 31 days.
// Ashadh 1 2083 is 2026-06-15; Ashadh has 32 days.
//   Jestha 3  = 2026-05-17        Jestha 19 = 2026-06-02
//   Jestha 5  = 2026-05-19        Jestha 20 = 2026-06-03
//   Jestha 7  = 2026-05-21        Jestha 23 = 2026-06-06
//   Jestha 10 = 2026-05-24        Jestha 27 = 2026-06-10
//   Jestha 11 = 2026-05-25        Jestha 31 = 2026-06-14
//   Jestha 15 = 2026-05-29        Ashadh 1  = 2026-06-15
//   Jestha 12 = 2026-05-26        Ashadh 4  = 2026-06-18
const CADENCE_START = '2026-05-17'; // Jestha 3 — the operational rollout value
const cooks = (...dates: string[]) => dates.map((date) => ({ date }));

describe('buildCadenceGrid', () => {
  it('returns an empty grid when there are no cook logs', () => {
    const grid = buildCadenceGrid([], CADENCE_START, '2026-07-01');
    expect(grid.anchors).toEqual([]);
    expect(grid.hardCheckins).toEqual([]);
  });

  it('ideal Jestha path: first cook Jestha 3 produces hard dates every 4 days', () => {
    const grid = buildCadenceGrid(
      cooks('2026-05-17', '2026-05-21', '2026-05-25', '2026-05-29',
            '2026-06-02', '2026-06-06', '2026-06-10', '2026-06-14'),
      CADENCE_START,
      '2026-06-15',
    );
    expect(grid.hardCheckins.map((h) => h.hardCheckinDate)).toEqual([
      '2026-05-21', '2026-05-25', '2026-05-29', '2026-06-02',
      '2026-06-06', '2026-06-10', '2026-06-14', '2026-06-18',
    ]);
    expect(grid.hardCheckins.slice(0, 7).every((h) => h.status === 'satisfied')).toBe(true);
    expect(grid.hardCheckins.every((h) => h.step === 4)).toBe(true);
    expect(grid.hardCheckins[7].status).toBe('open');
  });

  it('tightens the step toward 3 near month-end to stay on the 8-slot target', () => {
    // A single cook on Jestha 20 leaves only 11 days for 7 remaining slots.
    const grid = buildCadenceGrid(cooks('2026-06-03'), CADENCE_START, '2026-06-20');
    expect(grid.hardCheckins.slice(0, 4).map((h) => h.step)).toEqual([3, 3, 3, 3]);
    expect(grid.hardCheckins.slice(0, 4).map((h) => h.hardCheckinDate)).toEqual([
      '2026-06-06', '2026-06-09', '2026-06-12', '2026-06-15',
    ]);
  });

  it('produces one missed record per passed hard date across a long gap', () => {
    const grid = buildCadenceGrid(cooks('2026-05-17', '2026-06-10'), CADENCE_START, '2026-06-20');
    // The gap between the two cooks yields one miss per passed hard date, not one collapsed record.
    const missedInGap = grid.hardCheckins.filter(
      (h) => h.status === 'missed' && h.hardCheckinDate < '2026-06-10',
    );
    expect(missedInGap.map((h) => h.hardCheckinDate)).toEqual([
      '2026-05-21', '2026-05-25', '2026-05-29', '2026-06-02', '2026-06-06',
    ]);
    const j27 = grid.hardCheckins.find((h) => h.hardCheckinDate === '2026-06-10');
    expect(j27?.status).toBe('satisfied');
    expect(j27?.satisfiedByCookDate).toBe('2026-06-10');
  });

  it('re-anchors at the cook date for a cook and at the missed date for a miss', () => {
    const grid = buildCadenceGrid(cooks('2026-05-17', '2026-05-24'), CADENCE_START, '2026-06-01');
    expect(grid.hardCheckins[0]).toMatchObject({ hardCheckinDate: '2026-05-21', status: 'missed' });
    // The Jestha-11 hard date is satisfied by the Jestha-10 cook...
    expect(grid.hardCheckins[1]).toMatchObject({
      hardCheckinDate: '2026-05-25',
      status: 'satisfied',
      satisfiedByCookDate: '2026-05-24',
    });
    // ...and the next hard date is projected from the cook date (05-24), not the hard date (05-25).
    expect(grid.hardCheckins[2].anchorDate).toBe('2026-05-24');
    expect(grid.hardCheckins[2].hardCheckinDate).toBe('2026-05-28');
  });

  it('counts a cook before the +3 edge as satisfying the slot', () => {
    const grid = buildCadenceGrid(cooks('2026-05-17', '2026-05-19'), CADENCE_START, '2026-06-01');
    expect(grid.hardCheckins[0]).toMatchObject({
      hardCheckinDate: '2026-05-21',
      status: 'satisfied',
      satisfiedByCookDate: '2026-05-19',
    });
  });

  it('preserves grid continuity across a Nepali-month boundary (no reset on the 1st)', () => {
    const grid = buildCadenceGrid(
      cooks('2026-05-17', '2026-05-21', '2026-05-25', '2026-05-29',
            '2026-06-02', '2026-06-06', '2026-06-10', '2026-06-14'),
      CADENCE_START,
      '2026-07-01',
    );
    const afterJestha31 = grid.hardCheckins.find((h) => h.anchorDate === '2026-06-14');
    // Jestha 31 + 4 days lands on Ashadh 4, not Ashadh 1.
    expect(afterJestha31?.hardCheckinDate).toBe('2026-06-18');
    expect(afterJestha31?.nepaliMonth).toBe('2083-Ashadh');
  });

  it('never generates hard dates before the cadence start date', () => {
    // The Jestha-1 cook is before the cadence start and must be ignored.
    const grid = buildCadenceGrid(cooks('2026-05-15', '2026-05-19'), CADENCE_START, '2026-06-01');
    expect(grid.anchors[0]).toEqual({ date: '2026-05-19', kind: 'cook' });
    expect(grid.hardCheckins.every((h) => h.hardCheckinDate >= CADENCE_START)).toBe(true);
  });

  it('only turns hard dates strictly before asOf into misses; today/future stay open', () => {
    const onEdge = buildCadenceGrid(cooks('2026-05-17'), CADENCE_START, '2026-05-21');
    expect(onEdge.hardCheckins).toHaveLength(1);
    expect(onEdge.hardCheckins[0]).toMatchObject({ hardCheckinDate: '2026-05-21', status: 'open' });

    const pastEdge = buildCadenceGrid(cooks('2026-05-17'), CADENCE_START, '2026-05-22');
    expect(pastEdge.hardCheckins.map((h) => [h.hardCheckinDate, h.status])).toEqual([
      ['2026-05-21', 'missed'],
      ['2026-05-25', 'open'],
    ]);
  });
});

describe('detectMissedCheckins', () => {
  it('returns the missed records that should exist but are not yet stored', () => {
    const result = detectMissedCheckins(
      cooks('2026-05-17'),
      CADENCE_START,
      [{ nepaliMonth: '2083-Jestha', hardCheckinDate: '2026-05-21' }],
      '2026-06-01',
    );
    expect(result).toEqual([
      { nepaliMonth: '2083-Jestha', hardCheckinDate: '2026-05-25' },
      { nepaliMonth: '2083-Jestha', hardCheckinDate: '2026-05-29' },
    ]);
  });

  it('returns nothing when every missed record is already stored (idempotent)', () => {
    const existing = [
      { nepaliMonth: '2083-Jestha', hardCheckinDate: '2026-05-21' },
      { nepaliMonth: '2083-Jestha', hardCheckinDate: '2026-05-25' },
      { nepaliMonth: '2083-Jestha', hardCheckinDate: '2026-05-29' },
    ];
    expect(detectMissedCheckins(cooks('2026-05-17'), CADENCE_START, existing, '2026-06-01')).toEqual([]);
  });
});

describe('getCadenceStatus', () => {
  it('reports neutral status when there are no cooks', () => {
    const status = getCadenceStatus([], [], CADENCE_START, '2026-06-01');
    expect(status).toEqual({
      lastCookDate: null,
      nextHardCheckinDate: null,
      isOverdue: false,
      cooksThisCycle: 0,
      missedThisCycle: 0,
      targetCooks: CADENCE_TARGET_COOKS,
    });
  });

  it('summarizes last cook, next check-in, overdue flag, and this-cycle counts', () => {
    const status = getCadenceStatus(
      cooks('2026-05-17', '2026-05-21'),
      [{ nepaliMonth: '2083-Jestha', hardCheckinDate: '2026-05-25' }],
      CADENCE_START,
      '2026-05-26',
    );
    expect(status.lastCookDate).toBe('2026-05-21');
    expect(status.nextHardCheckinDate).toBe('2026-05-29');
    expect(status.isOverdue).toBe(true);
    expect(status.cooksThisCycle).toBe(2);
    expect(status.missedThisCycle).toBe(1);
    expect(status.targetCooks).toBe(8);
  });

  it('is not overdue when the latest cook is more recent than every miss', () => {
    const status = getCadenceStatus(
      cooks('2026-05-17', '2026-05-21', '2026-05-25'),
      [],
      CADENCE_START,
      '2026-05-26',
    );
    expect(status.isOverdue).toBe(false);
  });
});
