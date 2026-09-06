import type { TransformationStage } from "./rename.js";

/** Preserves literals until a parser-backed string rewrite can guarantee identical semantics. */
export function transformStrings(source: string): TransformationStage {
  return { source, applied: false, note: "String rewriting is deferred until parser-backed literal transformations are available." };
}
