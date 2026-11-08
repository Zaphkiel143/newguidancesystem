import { test } from "node:test";
import assert from "node:assert/strict";
import { hasSafetyWord, needsMoreDetail, stressWithoutCause, unfinishedFeeling, unfinishedOpener } from "../lib/nlp.ts";

test("needsMoreDetail asks for more when only a person or a vague state is named", () => {
  for (const m of ["my mom", "my friend", "someone", "its about my family", "its about school", "lost", "im confused", "worried", "not good", "everything is hard", "i have a problem", "im in trouble", "i dont know what to do", "can i ask something"]) {
    assert.equal(needsMoreDetail(m), "en", m);
  }
  for (const m of ["tulong", "may problema ako", "nahihirapan ako", "ayoko na talaga", "hindi ko alam gagawin ko", "pwede ba magtanong", "kaibigan ko"]) {
    assert.equal(needsMoreDetail(m), "tl", m);
  }
});

test("needsMoreDetail leaves messages with a real detail to the classifier", () => {
  for (const m of ["my mom and dad keep arguing", "my friend seems really depressed, what should I do", "someone keeps making fun of me in class", "I really need someone to listen to me", "kailangan ko ng kausap", "i feel lonely", "im sad", "I'm okay", "my classmates are bullying me online", "lost my id", "i lost my phone"]) {
    assert.equal(needsMoreDetail(m), null, m);
  }
});

test("crisis and abuse wording always skips the pre-checks", () => {
  for (const m of ["ayoko na mabuhay", "I want to die", "gusto ko nang mamatay", "someone hurt me", "my dad hits me", "hinipuan ako", "I want to disappear"]) {
    assert.equal(hasSafetyWord(m), true, m);
  }
  for (const m of ["my mom", "ayoko na talaga", "I want", "tulong"]) {
    assert.equal(hasSafetyWord(m), false, m);
  }
});

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
