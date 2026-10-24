import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COLLEGE_CAREER_FORM,
  CONFIDENTIAL_FIELDS,
  cleanAnswers,
  firstSectionWithError,
  validateAnswers,
  type Answers,
} from "../app/config/collegeCareerForm.ts";

// A fully answered form, built from the config so it stays in step with it
function complete(): Answers {
  const a: Answers = {};
  for (const s of COLLEGE_CAREER_FORM)
    for (const f of s.fields) {
      if (!f.required) continue;
      if (f.type === "date") a[f.id] = "2000-01-15";
      else if (f.type === "checks") a[f.id] = [f.options![0]];
      else if (f.type === "select" || f.type === "radio") a[f.id] = f.options![f.options!.length - 1];
      else a[f.id] = "N/A";
    }
  return a;
}

test("a complete form passes; drafts may be empty", () => {
  assert.deepEqual(validateAnswers(cleanAnswers(complete()), true), {});
  assert.deepEqual(validateAnswers(cleanAnswers({}), false), {});
});

test("submitting with a required answer missing points at its page", () => {
  const a = complete();
  delete a.motherName;
  const errors = validateAnswers(cleanAnswers(a), true);
  assert.equal(errors.motherName, "Please answer this question.");
  assert.equal(COLLEGE_CAREER_FORM[firstSectionWithError(errors)].id, "family");
});

test("follow-up details are only required after Yes", () => {
  const a = complete();
  a.hospitalized = "No";
  delete a.hospitalizedDetails;
  assert.equal(validateAnswers(cleanAnswers(a), true).hospitalizedDetails, undefined);
  a.hospitalized = "Yes";
  assert.equal(validateAnswers(cleanAnswers(a), true).hospitalizedDetails, "Please answer this question.");
});

test("answers to hidden questions are dropped", () => {
  const a = complete();
  a.operation = "No";
  a.operationDetails = "should not be kept";
  assert.equal(cleanAnswers(a).operationDetails, undefined);
});

test("choices must come from the list; Other needs text", () => {
  const a = complete();
  a.program = "BS Underwater Basket Weaving";
  a.concerns = ["Stress", "Other: "];
  const e = validateAnswers(cleanAnswers(a), true);
  assert.ok(e.program);
  assert.ok(e.concerns);
  a.program = "BS Information Technology";
  a.concerns = ["Stress", "Other: exams"];
  assert.deepEqual(validateAnswers(cleanAnswers(a), true), {});
});

test("dates must be real and not in the future", () => {
  const a = complete();
  for (const bad of ["2001-02-30", "15/01/2000", "2999-01-01", "1800-01-01"]) {
    a.birthdate = bad;
    assert.ok(validateAnswers(cleanAnswers(a), true).birthdate, bad);
  }
});

test("overly long answers are rejected", () => {
  const a = complete();
  a.nickname = "x".repeat(301);
  a.strengths = "y".repeat(2001);
  const e = validateAnswers(cleanAnswers(a), true);
  assert.ok(e.nickname);
  assert.ok(e.strengths);
});

test("unknown fields and odd input are ignored without throwing", () => {
  assert.deepEqual(cleanAnswers(null), {});
  assert.deepEqual(cleanAnswers("nope"), {});
  const c = cleanAnswers({ hacker: "x", nickname: "  Jun  ", concerns: "Stress" });
  assert.equal(c.hacker, undefined);
  assert.equal(c.nickname, "Jun");
  assert.equal(c.concerns, undefined);
});

test("the health section is confidential", () => {
  assert.ok(CONFIDENTIAL_FIELDS.has("illness"));
  assert.ok(CONFIDENTIAL_FIELDS.has("concerns"));
  assert.ok(!CONFIDENTIAL_FIELDS.has("nickname"));
});
