import { test } from "node:test";
import assert from "node:assert/strict";
import { roleFromSchoolEmail } from "../app/config/school.ts";

test("school emails tell students and faculty apart", () => {
  assert.equal(roleFromSchoolEmail("abelis.329720@stamaria.sti.edu.ph"), "STUDENT");
  assert.equal(roleFromSchoolEmail("Juan.DelaCruz@stamaria.sti.edu.ph"), "FACULTY");
  assert.equal(roleFromSchoolEmail("maria.santos-reyes@stamaria.sti.edu.ph"), "FACULTY");
  assert.equal(roleFromSchoolEmail("registrar@stamaria.sti.edu.ph"), null);
  assert.equal(roleFromSchoolEmail("j_cruz@stamaria.sti.edu.ph"), null);
});
