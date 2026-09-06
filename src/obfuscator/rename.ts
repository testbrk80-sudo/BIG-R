export interface TransformationStage {
  source: string;
  applied: boolean;
  note?: string;
}

/**
 * Deliberately conservative until a genuine scope-aware Luau AST binding layer is available.
 * Regex identifier replacement would corrupt valid programs, so this stage preserves source.
 */
export function renameLocalIdentifiers(source: string): TransformationStage {
  return { source, applied: false, note: "Local renaming is deferred until scope-aware AST tooling is integrated." };
}
