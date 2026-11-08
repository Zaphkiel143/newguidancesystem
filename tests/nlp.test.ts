import { test } from "node:test";
import assert from "node:assert/strict";
import { stressWithoutCause, unfinishedFeeling, unfinishedOpener } from "../lib/nlp.ts";

test("stressWithoutCause asks for the cause when none is given", () => {
  for (const m of ["i feeling stressed", "I'm so stressed", "im stressed out", "stressed", "I feel overwhelmed lately", "i am really stressed right now"]) {
    assert.equal(stressWithoutCause(m), "en", m);
  }
  for (const m of ["stressed ako", "sobrang stress ko", "na-stress ako", "nasstress ako ngayon"]) {
    assert.equal(stressWithoutCause(m), "tl", m);
  }
});

test("stressWithoutCause leaves stress with a cause to the classifier", () => {
  for (const m of ["im stressed about exams", "stressed because of my thesis", "my family stresses me", "stressed sa exam", "i feel sad", "im stressed and i want to die"]) {
    assert.equal(stressWithoutCause(m), null, m);
  }
});

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
