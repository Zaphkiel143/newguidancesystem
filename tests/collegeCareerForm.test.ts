import { test } from "node:test";
import assert from "node:assert/strict";
import {
  COLLEGE_CAREER_FORM,
  CONFIDENTIAL_FIELDS,
  capitalizeName,
  cleanAnswers,
  phoneChars,
  withLegacyDefaults,
  firstSectionWithError,
  validateAnswers,
  type Answers,
} from "../app/config/collegeCareerForm.ts";

// A fully answered form, built from the config so it stays in step with it.
function complete(): Answers {
  const a: Answers = {};
  for (const s of COLLEGE_CAREER_FORM)
    for (const f of s.fields) {
      if (!f.required) continue;
      if (f.type === "date") a[f.id] = "2000-01-15";
      else if (f.type === "checks") a[f.id] = [f.options![0]];
      else if (f.type === "select" || f.type === "radio") a[f.id] = f.options![f.options!.length - 1];
      else if (f.type === "phone") a[f.id] = "09171234567";
      else if (f.type === "name") a[f.id] = "Dela Cruz, Juan A.";
      else if (f.id === "email") a[f.id] = "juan@stamaria.sti.edu.ph";
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

test("phone numbers must be Philippine mobile numbers", () => {
  const a = complete();
  for (const bad of ["0917123456", "091712345678", "0917-123-4567", "+6309171234567", "abc"]) {
    a.cellphone = bad;
    assert.ok(validateAnswers(cleanAnswers(a), true).cellphone, bad);
  }
  for (const good of ["09171234567", "+639171234567"]) {
    a.cellphone = good;
    assert.equal(validateAnswers(cleanAnswers(a), true).cellphone, undefined, good);
  }
  assert.equal(phoneChars("+63 917-123 4567+"), "+639171234567");
});

test("names are capitalised and letters only", () => {
  assert.equal(capitalizeName("dela cruz-santos, juan o'neil (jun)"), "Dela Cruz-Santos, Juan O'Neil (Jun)");
  assert.equal(capitalizeName("niño mcArthur"), "Niño McArthur");
  const a = complete();
  a.guardianName = "Juan 123";
  assert.ok(validateAnswers(cleanAnswers(a), true).guardianName);
});

test("sibling questions follow how many siblings there are", () => {
  const a = complete();
  a.siblingCount = "None";
  for (const id of ["sibling1Name", "sibling2Name", "otherSiblings"]) delete a[id];
  assert.deepEqual(validateAnswers(cleanAnswers(a), true), {});
  a.siblingCount = "1";
  const e = validateAnswers(cleanAnswers(a), true);
  assert.ok(e.sibling1Name);
  assert.equal(e.sibling2Name, undefined);
  assert.equal(e.otherSiblings, undefined);
});

test("work experience can be left out entirely", () => {
  const a = complete();
  for (const id of ["hasWork", "company", "position", "duration", "jobDescription", "otherWork"]) delete a[id];
  assert.deepEqual(validateAnswers(cleanAnswers(a), true), {});
  a.hasWork = "Yes";
  assert.ok(validateAnswers(cleanAnswers(a), true).company);
});

test("other nationalities come from the list", () => {
  const a = complete();
  a.nationality = "Other";
  a.nationalityOther = "Martian";
  assert.ok(validateAnswers(cleanAnswers(a), true).nationalityOther);
  a.nationalityOther = "Japanese";
  assert.equal(validateAnswers(cleanAnswers(a), true).nationalityOther, undefined);
});

test("older saved forms keep their sibling and work answers", () => {
  const a = withLegacyDefaults({ sibling1Name: "Ana", sibling2Name: "Ben", company: "Jollibee" });
  assert.equal(a.siblingCount, "2");
  assert.equal(a.hasWork, "Yes");
  assert.equal(withLegacyDefaults({ company: "N/A" }).hasWork, undefined);
});

test("the health section is confidential", () => {
  assert.ok(CONFIDENTIAL_FIELDS.has("illness"));
  assert.ok(CONFIDENTIAL_FIELDS.has("concerns"));
  assert.ok(!CONFIDENTIAL_FIELDS.has("nickname"));
});
