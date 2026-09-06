import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { sha256 } from "../src/obfuscator/integrity.js";
import { renameLocalIdentifiers } from "../src/obfuscator/rename.js";
import { validateLuau } from "../src/luau/validator.js";

const validLuau = `-- comment: local name must remain text\nlocal greeting = "local greeting"\nlocal data = { key = greeting, ["fixed"] = 5 }\nfor i = 1, 3 do\n  if data.key then print(greeting, i) end\nend\n`;

test("conservative identifier stage preserves strings, comments, tables, conditionals, and loops", () => {
  const result = renameLocalIdentifiers(validLuau);
  assert.equal(result.source, validLuau);
  assert.equal(result.applied, false);
  assert.match(result.source, /"local greeting"/);
  assert.match(result.source, /-- comment/);
});

test("integrity hashes are deterministic", () => {
  assert.equal(sha256("hello"), sha256("hello"));
  assert.notEqual(sha256("hello"), sha256("goodbye"));
});

test("official compiler accepts the valid fixture when configured", { skip: !process.env.LUAU_COMPILER }, async () => {
  const fixture = fileURLToPath(new URL("./fixtures/valid.luau", import.meta.url));
  const validSource = await readFile(fixture, "utf8");
  await assert.doesNotReject(validateLuau(validSource));
});

test("official compiler rejects invalid Luau when configured", { skip: !process.env.LUAU_COMPILER }, async () => {
  const fixture = fileURLToPath(new URL("./fixtures/invalid.luau", import.meta.url));
  const invalidLuau = await readFile(fixture, "utf8");
  await assert.rejects(validateLuau(invalidLuau));
});
