import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { assertLuauCompilerAvailable, compileLuau } from "../src/luau/compiler.js";
import { validateLuau } from "../src/luau/validator.js";
import { renameLocalIdentifiers } from "../src/obfuscator/rename.js";
import { sha256 } from "../src/obfuscator/integrity.js";

const hasCompiler = await assertLuauCompilerAvailable().then(() => true, () => false);
const validFixture = join(process.cwd(), "test", "fixtures", "valid.luau");
const invalidFixture = join(process.cwd(), "test", "fixtures", "invalid.luau");

test("conservative transforms preserve comments and string literals", () => {
  const source = "-- local name\nlocal label = \"local label\"\n";
  assert.equal(renameLocalIdentifiers(source).source, source);
  assert.equal(sha256(source), sha256(source));
});

test("official Luau parser accepts valid source and produces bytecode", { skip: !hasCompiler }, async () => {
  const source = await readFile(validFixture, "utf8");
  await assert.doesNotReject(validateLuau(source));
  const compilation = await compileLuau(source);
  assert.ok(compilation.bytecode.length > 0);
});

test("official Luau parser rejects invalid source", { skip: !hasCompiler }, async () => {
  const source = await readFile(invalidFixture, "utf8");
  await assert.rejects(validateLuau(source));
});
