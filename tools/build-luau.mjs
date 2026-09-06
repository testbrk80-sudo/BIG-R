import { access, chmod, copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cacheRoot = join(projectRoot, ".cache");
const buildRoot = join(cacheRoot, "luau");
const compilerPath = join(buildRoot, "bin", "luau-compile");
const sourceUrl = "https://github.com/luau-lang/luau/archive/refs/heads/master.tar.gz";

function run(command, arguments_, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, arguments_, { stdio: "inherit", ...options });
    child.once("error", reject);
    child.once("close", (code) => code === 0 ? resolvePromise() : reject(new Error(`${command} exited with code ${code ?? -1}`)));
  });
}

async function isExecutable(path) {
  try { await access(path, constants.X_OK); return true; } catch { return false; }
}

async function main() {
  if (process.platform === "win32" || process.env.LUAU_COMPILER?.trim() || await isExecutable(compilerPath)) return;
  await mkdir(cacheRoot, { recursive: true });
  const temporaryDirectory = await mkdtemp(join(cacheRoot, "luau-source-"));
  const archivePath = join(temporaryDirectory, "luau.tar.gz");
  const sourceDirectory = join(temporaryDirectory, "luau-master");
  const buildDirectory = join(temporaryDirectory, "build");
  try {
    console.log("Building the official Luau compiler for Linux...");
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok || !response.body) throw new Error(`Luau source download failed (${response.status}).`);
    await pipeline(response.body, createWriteStream(archivePath));
    await run("tar", ["-xzf", archivePath, "-C", temporaryDirectory]);
    await run("cmake", ["-S", sourceDirectory, "-B", buildDirectory, "-DCMAKE_BUILD_TYPE=Release"]);
    await run("cmake", ["--build", buildDirectory, "--target", "Luau.Compile.CLI", "--config", "Release", "--parallel"]);
    await mkdir(join(buildRoot, "bin"), { recursive: true });
    await copyFile(join(buildDirectory, "luau-compile"), compilerPath);
    await chmod(compilerPath, 0o755);
  } finally { await rm(temporaryDirectory, { recursive: true, force: true }); }
  if (!(await isExecutable(compilerPath))) throw new Error("Luau build completed but luau-compile was not found.");
}

main().catch((error) => { console.error("Could not prepare the Linux Luau compiler:", error.message); process.exitCode = 1; });