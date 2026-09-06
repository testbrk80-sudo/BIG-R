import { createHash } from "node:crypto";

export function sha256(source: string | Buffer): string {
  return createHash("sha256").update(source).digest("hex");
}
