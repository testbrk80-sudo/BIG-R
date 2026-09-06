import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LuauValidationError } from "./errors.js";
import { validateWithOfficialCompiler } from "./compiler.js";

export interface ValidationResult {
  valid: true;
  diagnostics: string;
}

/** Validates by asking the official Luau compiler to parse and compile the file. */
export async function validateLuau(source: string): Promise<ValidationResult> {
  if (source.length === 0) {
    throw new LuauValidationError("The Luau file is empty.", "Expected Luau source text.");
  }
  const directory = await mkdtemp(join(tmpdir(), "big-r-validate-"));
  const sourcePath = join(directory, "input.luau");
  try {
    await writeFile(sourcePath, source, "utf8");
    const result = await validateWithOfficialCompiler(sourcePath);
    const diagnostics = Buffer.concat([result.stdout, result.stderr]).toString("utf8").trim();
    if (result.exitCode !== 0) {
      throw new LuauValidationError("The file is not valid Luau.", diagnostics || "No parser diagnostics were provided.");
    }
    return { valid: true, diagnostics };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
