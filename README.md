# @panda/paws

The Panda CLI — resolve, validate, and run `@panda/kernel` manifests from the terminal.

**Status: implemented (Phase 6, see `panda-opencode/roadmap.md`).** See [`SPEC.md`](./SPEC.md) for the original scope decision, and the honest, still-real limitation (real npm package resolution for `panda:module` isn't done yet — Phase 4).

## Usage

```bash
paws validate <manifest.json> [--register <file.js>]
paws run <manifest.json> --entity <key> [--register <file.js>]
```

- `validate` — dry-run a manifest, printing every diagnostic (unknown types, schema violations, unresolved action references, unknown/circular dependencies) without constructing or running anything.
- `run` — resolve a manifest and run one entity by its manifest key.
- `--register <file.js>` — optional. A plain Node module exporting a `register(registry)` function, for any entity types/actions beyond `paws`'s built-in kernel stubs (`panda:command`, `panda:logger`, `panda:cli`, `panda:module`, `panda:dev-server`). See `examples/manifest.register.cjs` for a minimal example.
