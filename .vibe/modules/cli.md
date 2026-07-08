# Module: cli
**Role:** Command-line interface (Commander) generating mazes as PDF and, eventually, sending them to reMarkable. The `generate` command (width/height/seed/output) is implemented; authentication and upload commands are not yet added.
**Files:** `packages/cli/src/index.ts`, `packages/cli/src/generate.ts`, `packages/cli/src/cli-options.ts`
**Exports:** `remarkable-maze` binary (entry point `program.parse()`, subcommand `generate`), `runGenerate(options: GenerateOptions): Promise<GenerateResult>`, `parseIntegerOption(value, flagName): number`
**Depends on:** [`modules/core.md`](core.md)
