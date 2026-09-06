import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

interface ObfuscationStats { totalObfuscations: number; }

const statsPath = join(process.cwd(), "data", "stats.json");
let queue: Promise<void> = Promise.resolve();

async function readStats(): Promise<ObfuscationStats> {
  try {
    const raw = await readFile(statsPath, "utf8");
    const value: unknown = JSON.parse(raw);
    if (typeof value === "object" && value !== null && typeof (value as Partial<ObfuscationStats>).totalObfuscations === "number") {
      return { totalObfuscations: Math.max(0, Math.floor((value as ObfuscationStats).totalObfuscations)) };
    }
  } catch (error: unknown) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
  return { totalObfuscations: 0 };
}

async function writeStats(stats: ObfuscationStats): Promise<void> {
  await mkdir(dirname(statsPath), { recursive: true });
  const temporaryPath = `${statsPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(stats, null, 2)}\n`, "utf8");
  await rename(temporaryPath, statsPath);
}

/** Increments only after an artifact has been successfully compiled. */
export function recordSuccessfulObfuscation(): Promise<number> {
  const operation = queue.then(async () => {
    const stats = await readStats();
    stats.totalObfuscations += 1;
    await writeStats(stats);
    return stats.totalObfuscations;
  });
  queue = operation.then(() => undefined, () => undefined);
  return operation;
}
