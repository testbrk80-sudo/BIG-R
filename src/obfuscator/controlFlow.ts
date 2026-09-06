import type { TransformationStage } from "./rename.js";

/** Extension point only; no control-flow rewriting is safe without AST and CFG analysis. */
export function transformControlFlow(source: string): TransformationStage {
  return { source, applied: false, note: "Control-flow rewriting is not enabled in conservative mode." };
}
