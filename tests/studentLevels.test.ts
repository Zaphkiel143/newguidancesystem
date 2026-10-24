import { test } from "node:test";
import assert from "node:assert/strict";
import { isStudentId, sectionCodeForCourse, splitCollegeSection, yearSectionsFor } from "../app/config/studentLevels.ts";

test("student IDs are exactly 11 digits", () => {
  assert.ok(isStudentId("02000123456"));
  for (const bad of ["0200012345", "020001234567", "2024-12345", "0200012345a", ""]) assert.ok(!isStudentId(bad), bad);
});

test("year-sections follow the year level", () => {
  assert.deepEqual(yearSectionsFor("1st Year"), ["1-101", "1-102", "1-103", "1-104", "1-105"]);
  assert.equal(yearSectionsFor("3rd Year")[0], "3-301");
  assert.deepEqual(yearSectionsFor(""), []);
});

test("college sections split into program and year-section", () => {
  assert.deepEqual(splitCollegeSection("BSIT 1-101"), { code: "BSIT", yearSection: "1-101" });
  assert.equal(splitCollegeSection("BSXX 1-101"), null);
  assert.equal(splitCollegeSection("STEM-A"), null);
  assert.equal(splitCollegeSection(null), null);
});

test("courses map to their section codes", () => {
  assert.equal(sectionCodeForCourse("BS Computer Engineering"), "BSCPE");
  assert.equal(sectionCodeForCourse("Bachelor of Multimedia Arts"), "");
});
