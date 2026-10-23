import { test } from "node:test";
import assert from "node:assert/strict";
import { collegeSectionLabel, courseCode, isStudentId, sectionCodeForCourse, splitCollegeSection, yearSectionsFor } from "../app/config/studentLevels.ts";

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

test("college sections read as course code plus year-section", () => {
  assert.equal(collegeSectionLabel({ program: "BS Information Technology", section: "BSIT 1-101" }), "BSIT 1-101");
  assert.equal(collegeSectionLabel({ program: "BS Information Technology", gradeSection: "4th Year - BSIT 4-102" }), "BSIT 4-102");
  assert.equal(collegeSectionLabel({ program: "BS Business Administration", section: "201", yearLevel: "2nd Year" }), "BSBA 2-201");
  assert.equal(collegeSectionLabel({ program: "Bachelor of Multimedia Arts", gradeSection: "3rd Year - 301" }), "BMMA 3-301");
  assert.equal(collegeSectionLabel({ program: "BS Computer Science", section: "A" }), null);
  assert.equal(collegeSectionLabel({ section: "STEM-A" }), null);
});

test("every course has a short code", () => {
  assert.equal(courseCode("BS Hospitality Management"), "BSHM");
  assert.equal(courseCode("BS Information Systems"), "BSIS");
  assert.equal(courseCode("BS Psychology"), "BSP");
});
