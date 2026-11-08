import { test } from "node:test";
import assert from "node:assert/strict";
import { roleFromSchoolEmail, roleFromSignInId } from "../app/config/school.ts";

test("the sign-in page guesses the role from what was typed", () => {
  assert.equal(roleFromSignInId("09171234567"), "PARENT");
  assert.equal(roleFromSignInId("+63 917 123 4567"), "PARENT");
  assert.equal(roleFromSignInId(" abelis.329720@stamaria.sti.edu.ph "), "STUDENT");
  assert.equal(roleFromSignInId("Juan.DelaCruz@stamaria.sti.edu.ph"), "FACULTY");
  assert.equal(roleFromSignInId("registrar@stamaria.sti.edu.ph"), null);
  assert.equal(roleFromSignInId("juan.delacruz@gmail.com"), null);
  assert.equal(roleFromSignInId("091"), null);
  assert.equal(roleFromSignInId(""), null);
});

test("school emails tell students and faculty apart", () => {
  assert.equal(roleFromSchoolEmail("abelis.329720@stamaria.sti.edu.ph"), "STUDENT");
  assert.equal(roleFromSchoolEmail("Juan.DelaCruz@stamaria.sti.edu.ph"), "FACULTY");
  assert.equal(roleFromSchoolEmail("maria.santos-reyes@stamaria.sti.edu.ph"), "FACULTY");
  assert.equal(roleFromSchoolEmail("registrar@stamaria.sti.edu.ph"), null);
  assert.equal(roleFromSchoolEmail("j_cruz@stamaria.sti.edu.ph"), null);
});
