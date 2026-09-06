import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { LuauCompilationError, LuauToolingError } from "./errors.js";

export interface CompilerResult {
  bytecode: Buffer;
  diagnostics: string;
}

interface ProcessResult {
  exitCode: number;
  stdout: Buffer;
  stderr: Buffer;
}

const COMPILER_TIMEOUT_MS = 30_000;
const DEFAULT_LINUX_COMPILER = resolve(process.cwd(), ".cache", "luau", "bin", "luau-compile");
const DEFAULT_WINDOWS_COMPILER = resolve(process.cwd(), "tools", "luau", "luau-compile.exe");

export function getLuauCompilerPath(): string {
  const configuredPath = process.env.LUAU_COMPILER?.trim();
  if (configuredPath) return configuredPath;
  return process.platform === "win32" ? DEFAULT_WINDOWS_COMPILER : DEFAULT_LINUX_COMPILER;
}

export async function assertLuauCompilerAvailable(): Promise<string> {
  const compilerPath = getLuauCompilerPath();
  try {
    await access(compilerPath, constants.X_OK);
  } catch (error) {
    throw new LuauToolingError(
      `LUAU_COMPILER does not point to an executable official Luau compiler: ${compilerPath}`,
      error,
    );
  }
  return compilerPath;
}

async function runCompiler(arguments_: string[]): Promise<ProcessResult> {
  const compilerPath = await assertLuauCompilerAvailable();
  return new Promise((resolve, reject) => {
    const child = spawn(compilerPath, arguments_, { windowsHide: true });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let settled = false;
    const timeout = setTimeout(() => {
      child.kill();
      settled = true;
      reject(new LuauToolingError(`luau-compile did not finish within ${COMPILER_TIMEOUT_MS / 1000} seconds.`));
    }, COMPILER_TIMEOUT_MS);
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new LuauToolingError(`Could not start luau-compile: ${error.message}`, error));
    });
    child.once("close", (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        exitCode: exitCode ?? -1,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
      });
    });
  });
}

/** Compiles source with the official luau-compile binary format. */
export async function compileLuau(source: string): Promise<CompilerResult> {
  const workingDirectory = await mkdtemp(join(tmpdir(), "big-r-"));
  const inputPath = join(workingDirectory, "input.luau");
  try {
    await writeFile(inputPath, source, "utf8");
    const result = await runCompiler(["--binary", inputPath]);
    const diagnostics = result.stderr.toString("utf8").trim();
    if (result.exitCode !== 0) {
      throw new LuauCompilationError("Official Luau compilation failed.", diagnostics || "No compiler diagnostics were provided.");
    }
    return { bytecode: result.stdout, diagnostics };
  } finally {
    await rm(workingDirectory, { recursive: true, force: true });
  }
}

export async function validateWithOfficialCompiler(sourcePath: string): Promise<ProcessResult> {
  return runCompiler(["--null", "--only-parse", sourcePath]);
}
