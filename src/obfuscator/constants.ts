import type { TransformationStage } from "./rename.js";

/** Reserved for semantics-preserving AST constant transformations. */
export function transformConstants(source: string): TransformationStage {
  return { source, applied: false, note: "Constant rewriting is deferred to avoid changing numeric or table semantics." };
}
