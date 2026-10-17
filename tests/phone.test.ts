import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "../lib/phone.ts";

test("normalizePhone accepts local and +63 formats", () => {
  assert.equal(normalizePhone("09171234567"), normalizePhone("+639171234567"));
  assert.notEqual(normalizePhone("09171234567"), null);
});

test("normalizePhone rejects junk", () => {
  assert.equal(normalizePhone("hello"), null);
  assert.equal(normalizePhone(""), null);
});
