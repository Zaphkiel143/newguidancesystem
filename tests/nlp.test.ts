import { test } from "node:test";
import assert from "node:assert/strict";
import { unfinishedFeeling } from "../lib/nlp.ts";

test("unfinishedFeeling catches a feeling phrase with no feeling named", () => {
  for (const m of ["im feeling", "I'm feeling...", "i feel", "I am feeling so", "ive been feeling", "feeling", "i feel like"]) {
    assert.equal(unfinishedFeeling(m), "en", m);
  }
  for (const m of ["feeling ko", "Pakiramdam ko...", "nararamdaman ko ngayon", "ang feeling ko parang"]) {
    assert.equal(unfinishedFeeling(m), "tl", m);
  }
});

test("unfinishedFeeling leaves complete messages to the classifier", () => {
  for (const m of ["im feeling sad", "i feel great today", "I'm feeling anxious about exams", "feeling ko malungkot ako", "how are you feeling", "hi", "im okay"]) {
    assert.equal(unfinishedFeeling(m), null, m);
  }
});
