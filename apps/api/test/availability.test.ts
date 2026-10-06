import test from "node:test";
import assert from "node:assert/strict";
import { generateSlotMinutes, localDateTimeToUtc, minuteToTime, tashkentDate } from "../src/availability.ts";

test("generates stepped slots that fit the full service", () => {
  assert.deepEqual(generateSlotMinutes({ workStart: 600, workEnd: 720, duration: 45, step: 15, blocked: [] }), [600, 615, 630, 645, 660, 675]);
});

test("removes slots overlapping a break or booking", () => {
  assert.deepEqual(generateSlotMinutes({ workStart: 600, workEnd: 780, duration: 45, step: 15, blocked: [{ start: 660, end: 720 }] }), [600, 615, 720, 735]);
});

test("aligns the minimum notice to the configured step", () => {
  assert.deepEqual(generateSlotMinutes({ workStart: 600, workEnd: 720, duration: 30, step: 15, blocked: [], earliest: 637 }), [645, 660, 675, 690]);
});

test("converts Tashkent wall time to UTC", () => {
  assert.equal(localDateTimeToUtc("2026-10-06", 600).toISOString(), "2026-10-06T05:00:00.000Z");
  assert.equal(minuteToTime(605), "10:05");
  assert.equal(tashkentDate(new Date("2026-10-05T20:30:00Z")), "2026-10-06");
});
