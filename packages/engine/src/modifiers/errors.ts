export class ModifierEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModifierEngineError";
  }
}
