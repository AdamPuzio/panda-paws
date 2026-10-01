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

## A real bug found and worked around, not fixed, while building this

`@panda/command` silently drops any `--option` that appears after a *second* positional argument (its `'positional'` argument strategy never registers argument definitions with the underlying parser, so `stopAtFirstUnknown` halts at the first bare positional and swallows everything after). Confirmed by reading `@panda/command`'s own source, not guessed. `paws run` avoids this entirely by using `--entity <key>` as an option rather than a second positional argument, rather than requiring users to remember an "options must come first" workaround. Full account in `panda-opencode/DECISIONS.md` (2026-09-30 entry) — the underlying `@panda/command` defect itself is flagged, not fixed, since fixing it properly is a separate, scoped piece of work on an already-published library.

