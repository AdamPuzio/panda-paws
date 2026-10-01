/**
 * @panda/paws — src/index.ts
 *
 * Phase 6, built for real: the developer-facing entry point to
 * @panda/kernel — an installable CLI, not just a library you `import` and
 * hand-write a script against. See SPEC.md for the original scope
 * decision and why this was sequenced after Phase 2/3/5.
 *
 * Built directly on the REAL, retrofitted @panda/command — not wrapped as
 * a manifest-driven `panda:command` entity, since paws itself is the
 * outermost program (the thing that LOADS and runs manifests), not
 * something a manifest would declare as one of its own entities. This is
 * the dogfooding decision flagged as open in SPEC.md's "next step" note,
 * now made: paws bootstraps itself with the real library directly, the
 * ordinary way any Node CLI would, rather than reinventing argument
 * parsing or routing its own bootstrap through the kernel it's built to
 * serve.
 *
 * Honest, deliberate scope limit, stated plainly rather than glossed
 * over: `panda:module`'s `source` still resolves against
 * `registry.registerModuleSource()` (an explicit in-memory stand-in, not
 * real npm package resolution — that's Phase 4, not done). This means
 * paws cannot yet dynamically pull in a third-party npm package's own
 * entity types just from a manifest referencing it by name. What IS real
 * today: paws registers the kernel's own built-in entity types
 * (`panda:command`, `panda:logger`, `panda:cli`, `panda:module`,
 * `panda:dev-server`) by default, and lets a manifest's author supply
 * their OWN additional entity types and actions via a companion
 * "register" module (`--register <file>`) — a plain Node/CJS-or-ESM file
 * exporting a `register(registry)` function. This is a real, working
 * escape hatch for exactly the gap Phase 4 will eventually close
 * properly; it is not pretending Phase 4 is done.
 */

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve as resolvePath } from 'node:path'
import { Command } from '@panda/command'
import {
  PandaRegistry,
  resolve,
  validate,
  PandaLoggerEntity,
  createCommandEntity,
  PandaCliEntity,
  createModuleEntity,
  PandaDevServerEntity,
} from '@panda/kernel'
import type { PandaManifest } from '@panda/kernel'

/** Every manifest gets these registered by default, so a simple manifest
 *  works with zero setup — see the file-level doc comment above on why
 *  anything beyond this needs `--register`. */
function buildRegistry(): PandaRegistry {
  const registry = new PandaRegistry()
  registry.registerEntity(PandaLoggerEntity)
  registry.registerEntity(createCommandEntity(registry))
  registry.registerEntity(PandaCliEntity)
  registry.registerEntity(createModuleEntity(registry))
  registry.registerEntity(PandaDevServerEntity)
  return registry
}

async function applyRegisterFile(registry: PandaRegistry, registerFile?: string): Promise<void> {
  if (!registerFile) return
  const mod = await import(pathToFileURL(resolvePath(process.cwd(), registerFile)).href)
  const register = mod.register ?? mod.default
  if (typeof register !== 'function') {
    throw new Error(`"${registerFile}" does not export a "register(registry)" function`)
  }
  await register(registry)
}

function loadManifest(path: string): PandaManifest {
  return JSON.parse(readFileSync(resolvePath(process.cwd(), path), 'utf-8')) as PandaManifest
}

const validateCommand = new Command({
  name: 'validate',
  command: 'validate',
  description: 'Validate a manifest without resolving or running anything (dry-run)',
  arguments: { name: 'manifest', description: 'Path to a manifest JSON file' },
  options: [
    { name: 'register', description: 'Path to a module exporting register(registry) for custom entity types/actions' },
  ],
  action: async (rawData: Record<string, unknown>) => {
    const data = rawData as { manifest: string; register?: string }
    const registry = buildRegistry()
    await applyRegisterFile(registry, data.register)
    const manifest = loadManifest(data.manifest)
    const result = validate(manifest, registry)

    if (result.diagnostics.length === 0) {
      console.log(`✔ "${data.manifest}" is valid — no diagnostics.`)
    } else {
      for (const d of result.diagnostics) {
        const prefix = d.severity === 'error' ? '✖' : '⚠'
        const where = d.entityKey ? ` [${d.entityKey}]` : ''
        console.log(`${prefix}${where} ${d.message}`)
      }
      console.log(`\n${result.valid ? '✔ Valid' : '✖ Invalid'} — ${result.diagnostics.length} diagnostic(s).`)
    }

    if (!result.valid) process.exitCode = 1
  },
})

const runCommand = new Command({
  name: 'run',
  command: 'run',
  description: 'Resolve a manifest and run one of its top-level entities',
  arguments: { name: 'manifest', description: 'Path to a manifest JSON file' },
  options: [
    { name: 'entity', required: true, description: 'Manifest key of the entity to run' },
    { name: 'register', description: 'Path to a module exporting register(registry) for custom entity types/actions' },
  ],
  action: async (rawData: Record<string, unknown>) => {
    const data = rawData as { manifest: string; entity: string; register?: string }
    const registry = buildRegistry()
    await applyRegisterFile(registry, data.register)
    const manifest = loadManifest(data.manifest)

    const instances = await resolve(manifest, registry)
    const target = instances[data.entity]
    if (!target) {
      throw new Error(`"${data.entity}" is not an entity key in "${data.manifest}"`)
    }

    const result = await target.run(undefined as never)
    console.log(result)
  },
})

const paws = new Command({
  name: 'paws',
  description: 'The Panda CLI — resolve, validate, and run @panda/kernel manifests from the terminal.',
  version: '0.1.0',
  subcommands: [validateCommand, runCommand],
})

paws.run().catch((err: Error) => {
  console.error(err.message ?? err)
  process.exit(1)
})
