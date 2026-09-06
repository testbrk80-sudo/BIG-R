export class LuauToolingError extends Error {
  public constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "LuauToolingError";
  }
}

export class LuauValidationError extends Error {
  public constructor(message: string, public readonly diagnostics: string) {
    super(message);
    this.name = "LuauValidationError";
  }
}

export class LuauCompilationError extends Error {
  public constructor(message: string, public readonly diagnostics: string) {
    super(message);
    this.name = "LuauCompilationError";
  }
}
