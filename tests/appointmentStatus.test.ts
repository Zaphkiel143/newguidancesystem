import { test } from "node:test";
import assert from "node:assert/strict";
import { appointmentStatus, slotsCoveredBy, statusLabel, takenSlots } from "../lib/appointmentStatus.ts";

// 2026-11-10 10:30 AM in Manila (02:30 UTC)
const now = new Date("2026-11-10T02:30:00Z");
const day = (d: string) => new Date(`${d}T00:00:00Z`);

test("a pending request whose time has passed reads as Not confirmed", () => {
  assert.equal(appointmentStatus({ status: "PENDING", date: day("2026-11-09"), time: "3:00 PM" }, now), "EXPIRED");
  assert.equal(appointmentStatus({ status: "PENDING", date: day("2026-11-10"), time: "9:00 AM" }, now), "EXPIRED");
  assert.equal(appointmentStatus({ status: "PENDING", date: day("2026-11-10"), time: "11:00 AM" }, now), "PENDING");
  assert.equal(appointmentStatus({ status: "PENDING", date: day("2026-11-11"), time: "8:00 AM" }, now), "PENDING");
  assert.equal(statusLabel({ status: "PENDING", date: day("2026-08-27"), time: "8:30 AM" }, now), "Not confirmed");
});

test("every page uses the same labels", () => {
  assert.equal(statusLabel({ status: "CANCELLED", date: day("2026-11-12"), time: "9:00 AM" }, now), "Cancelled");
  assert.equal(statusLabel({ status: "COMPLETED", date: day("2026-11-01"), time: "9:00 AM" }, now), "Terminated");
  assert.equal(statusLabel({ status: "CONFIRMED", date: day("2026-11-01"), time: "9:00 AM" }, now), "Confirmed");
});

test("bookings take every hour they overlap", () => {
  assert.deepEqual(slotsCoveredBy("9:00 AM"), ["9:00 AM"]);
  assert.deepEqual(slotsCoveredBy("8:00 AM - 9:00 AM"), ["8:00 AM"]);
  assert.deepEqual(slotsCoveredBy("9:00 AM - 9:30 AM"), ["9:00 AM"]);
  assert.deepEqual(slotsCoveredBy("8:30 AM"), ["8:00 AM", "9:00 AM"]);
  assert.equal(slotsCoveredBy("Custom Block").length, 7);
});

test("taken slots combine bookings and blocks", () => {
  assert.deepEqual(takenSlots(["10:00 AM", "8:00 AM - 9:00 AM", "10:00 AM"]), ["8:00 AM", "10:00 AM"]);
  assert.deepEqual(takenSlots([]), []);
});
