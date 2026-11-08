import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLAIM_HOLD_MS,
  HANDOVER_CODE_LENGTH,
  HANDOVER_MAX_ATTEMPTS,
  HANDOVER_VALID_MS,
  checkHandover,
  cleanHandoverCode,
  formatHandoverCode,
  handoverWindow,
  isSchoolEmail,
  makeHandoverCode,
} from "../lib/handover.ts";

const now = new Date("2026-11-08T08:00:00Z");

test("handover codes are long, readable, and survive copy-paste formatting", () => {
  let i = 0;
  const code = makeHandoverCode((n) => i++ % n);
  assert.equal(code.length, HANDOVER_CODE_LENGTH);
  assert.match(code, /^[A-HJ-NP-Z2-9]+$/);
  assert.equal(cleanHandoverCode(` ${formatHandoverCode(code).toLowerCase()} `), code);
});

test("only STI school emails can receive the role", () => {
  assert.equal(isSchoolEmail("maria.santos@stamaria.sti.edu.ph"), true);
  assert.equal(isSchoolEmail("maria.santos@gmail.com"), false);
  assert.equal(isSchoolEmail("maria santos@stamaria.sti.edu.ph"), false);
});

test("a transfer works right away; a claim waits while a Guidance Associate can object", () => {
  const transfer = handoverWindow("TRANSFER", now, 1);
  assert.equal(transfer.usableAfter.getTime(), now.getTime());
  assert.equal(transfer.expiresAt.getTime(), now.getTime() + HANDOVER_VALID_MS);

  const contested = handoverWindow("CLAIM", now, 1);
  assert.equal(contested.usableAfter.getTime(), now.getTime() + CLAIM_HOLD_MS);
  assert.equal(contested.expiresAt.getTime(), now.getTime() + CLAIM_HOLD_MS + HANDOVER_VALID_MS);

  const vacant = handoverWindow("CLAIM", now, 0);
  assert.equal(vacant.usableAfter.getTime(), now.getTime());
});

test("a handover can't be redeemed when used, cancelled, expired, locked or still on hold", () => {
  const base = { usedAt: null, cancelledAt: null, attempts: 0, usableAfter: now, expiresAt: new Date(now.getTime() + 1000) };
  assert.deepEqual(checkHandover(base, now), { ok: true });
  assert.deepEqual(checkHandover(null, now), { ok: false, reason: "missing" });
  assert.deepEqual(checkHandover({ ...base, usedAt: now }, now), { ok: false, reason: "used" });
  assert.deepEqual(checkHandover({ ...base, cancelledAt: now }, now), { ok: false, reason: "cancelled" });
  assert.deepEqual(checkHandover({ ...base, expiresAt: now }, now), { ok: false, reason: "expired" });
  assert.deepEqual(checkHandover({ ...base, attempts: HANDOVER_MAX_ATTEMPTS }, now), { ok: false, reason: "locked" });
  assert.deepEqual(checkHandover({ ...base, usableAfter: new Date(now.getTime() + 1) }, now), { ok: false, reason: "waiting" });
});
