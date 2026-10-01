# @panda/paws — SPEC

**Status: implemented (Phase 6, done).** See `panda-opencode/roadmap.md` and `README.md` for usage.

## Why this name

Recovered from the "other laptop" archaeology (`panda-opencode/local-uncommitted-work.md`): `@panda/paws` was Adam's original name for exactly this kind of tool — an "Internal toolkit for @panda" with a planned `entity:create` command, itself built on an early, plop-based `@panda/scaffold`. That version was abandoned mid-build (debug `console.log`s still in place, never published). Revived the name for the same purpose, on the new kernel architecture.

## What it is

```bash
paws validate manifest.json                       # dry-run — see docs/validating-manifests.md
paws run manifest.json --entity deploy             # resolve() + run the named entity
paws validate manifest.json --register foo.js      # supply custom entity types/actions
```

Built directly on the real, retrofitted `@panda/command` (not wrapped as a manifest-driven entity — paws itself is the outermost program, the thing that loads and runs manifests, not something a manifest would declare as one of its own entities). This is the dogfooding decision this file's earlier draft flagged as open — now made.

## Honest, deliberate scope limit

`panda:module`'s `source` still resolves against `registry.registerModuleSource()` (Phase 4, not done — an explicit in-memory stand-in, not real npm package resolution). This means `paws` cannot yet dynamically pull in a third-party npm package's own entity types just from a manifest referencing it by name.

What IS real: `paws` registers the kernel's own built-in entity types by default (`panda:command`, `panda:logger`, `panda:cli`, `panda:module`, `panda:dev-server`), and lets a manifest's author supply their own additional entity types and actions via `--register <file.js>` — a plain Node module exporting `register(registry)`. This is a genuine, working escape hatch for exactly the gap Phase 4 will eventually close properly, not a pretense that Phase 4 is done.

## A real bug found, and fixed, while building this

`@panda/command` silently dropped any `--option` that appeared after a *second* positional argument (its `'positional'` argument strategy never registered argument definitions with the underlying parser, so `stopAtFirstUnknown` halted at the first bare positional and swallowed everything after). Confirmed by reading `@panda/command`'s own source, not guessed — and since fixed there directly (0.2.1 → 0.2.3), using the documented `command-line-args` pattern for collecting multiple bare positionals. `paws run` still uses `--entity <key>` as an option rather than a second positional argument regardless — a reasonable CLI shape on its own merits, not a workaround anymore. Full account in `panda-opencode/DECISIONS.md`.

