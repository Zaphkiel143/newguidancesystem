import { test } from "node:test";
import assert from "node:assert/strict";
import { unfinishedFeeling, unfinishedOpener } from "../lib/nlp.ts";

test("unfinishedOpener catches a message cut off before the point", () => {
  for (const m of ["I want", "i want to", "I need", "I have", "i", "I just want...", "I don't", "my", "I am", "want", "need"]) {
    assert.equal(unfinishedOpener(m), "en", m);
  }
  for (const m of ["gusto ko", "Ayoko na", "kailangan ko", "gusto ko na"]) {
    assert.equal(unfinishedOpener(m), "tl", m);
  }
});

test("unfinishedOpener never hides a real message, including crisis wording", () => {
  for (const m of ["I want to die", "i want to talk to someone", "I need help", "help", "ayoko na mabuhay", "gusto ko nang mamatay", "gusto ko mag book", "i want to book an appointment", "hi", "yes", "no", "ok", "thanks", "I have no friends", "wala"]) {
    assert.equal(unfinishedOpener(m), null, m);
  }
});

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
