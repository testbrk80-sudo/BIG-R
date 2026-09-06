import { compileLuau, type CompilerResult } from "../luau/compiler.js";
import { validateLuau } from "../luau/validator.js";
import { transformConstants } from "./constants.js";
import { transformControlFlow } from "./controlFlow.js";
import { sha256 } from "./integrity.js";
import { renameLocalIdentifiers, type TransformationStage } from "./rename.js";
import { transformStrings } from "./strings.js";

export interface ObfuscationOptions { compile?: boolean; }
export interface ObfuscationResult {
  source: string;
  integrityHash: string;
  stages: TransformationStage[];
  compilation?: CompilerResult;
}

export async function obfuscate(source: string, options: ObfuscationOptions = {}): Promise<ObfuscationResult> {
  await validateLuau(source);
  const stages: TransformationStage[] = [];
  let transformedSource = source;
  for (const stage of [renameLocalIdentifiers, transformStrings, transformConstants, transformControlFlow]) {
    const result = stage(transformedSource);
    stages.push(result);
    transformedSource = result.source;
  }
  await validateLuau(transformedSource);
  const result: ObfuscationResult = { source: transformedSource, integrityHash: sha256(transformedSource), stages };
  if (options.compile ?? true) result.compilation = await compileLuau(transformedSource);
  return result;
}
