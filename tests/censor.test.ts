import { test } from "node:test";
import assert from "node:assert/strict";
import { censor, hasBadWords } from "../lib/censor.ts";

test("English curse words are masked, keeping the first letter", () => {
  assert.equal(censor("what the fuck"), "what the f***");
  assert.equal(censor("This is SHIT"), "This is S***");
  assert.equal(censor("fucking bitches"), "f****** b******");
  assert.equal(censor("fuuuck"), "f*****");
});

test("Tagalog curse words are masked", () => {
  assert.equal(censor("putangina mo"), "p******** mo");
  assert.equal(censor("gago ka ba"), "g*** ka ba");
  assert.equal(censor("Tangina naman"), "T****** naman");
});

test("ordinary words that contain a bad word are left alone", () => {
  for (const ok of ["cockroach man", "first class", "assignment", "Scunthorpe", "passed", "ambassador", "titing", "pagpapaputang", "Hello po"]) {
    assert.equal(censor(ok), ok, ok);
    assert.equal(hasBadWords(ok), false, ok);
  }
});

test("hasBadWords finds them", () => {
  assert.equal(hasBadWords("ulol"), true);
  assert.equal(hasBadWords("ulol"), true); // stateful regex is reset between calls
  assert.equal(hasBadWords("Good morning"), false);
});
