"use strict";

// src/index.ts
var import_node_fs = require("fs");
var import_node_url = require("url");
var import_node_path = require("path");
var import_command = require("@panda/command");
var import_kernel = require("@panda/kernel");
function buildRegistry() {
  const registry = new import_kernel.PandaRegistry();
  registry.registerEntity(import_kernel.PandaLoggerEntity);
  registry.registerEntity((0, import_kernel.createCommandEntity)(registry));
  registry.registerEntity(import_kernel.PandaCliEntity);
  registry.registerEntity((0, import_kernel.createModuleEntity)(registry));
  registry.registerEntity(import_kernel.PandaDevServerEntity);
  return registry;
}
async function applyRegisterFile(registry, registerFile) {
  if (!registerFile) return;
  const mod = await import((0, import_node_url.pathToFileURL)((0, import_node_path.resolve)(process.cwd(), registerFile)).href);
  const register = mod.register ?? mod.default;
  if (typeof register !== "function") {
    throw new Error(`"${registerFile}" does not export a "register(registry)" function`);
  }
  await register(registry);
}
function loadManifest(path) {
  return JSON.parse((0, import_node_fs.readFileSync)((0, import_node_path.resolve)(process.cwd(), path), "utf-8"));
}
var validateCommand = new import_command.Command({
  name: "validate",
  command: "validate",
  description: "Validate a manifest without resolving or running anything (dry-run)",
  arguments: { name: "manifest", description: "Path to a manifest JSON file" },
  options: [
    { name: "register", description: "Path to a module exporting register(registry) for custom entity types/actions" }
  ],
  action: async (rawData) => {
    const data = rawData;
    const registry = buildRegistry();
    await applyRegisterFile(registry, data.register);
    const manifest = loadManifest(data.manifest);
    const result = (0, import_kernel.validate)(manifest, registry);
    if (result.diagnostics.length === 0) {
      console.log(`\u2714 "${data.manifest}" is valid \u2014 no diagnostics.`);
    } else {
      for (const d of result.diagnostics) {
        const prefix = d.severity === "error" ? "\u2716" : "\u26A0";
        const where = d.entityKey ? ` [${d.entityKey}]` : "";
        console.log(`${prefix}${where} ${d.message}`);
      }
      console.log(`
${result.valid ? "\u2714 Valid" : "\u2716 Invalid"} \u2014 ${result.diagnostics.length} diagnostic(s).`);
    }
    if (!result.valid) process.exitCode = 1;
  }
});
var runCommand = new import_command.Command({
  name: "run",
  command: "run",
  description: "Resolve a manifest and run one of its top-level entities",
  arguments: { name: "manifest", description: "Path to a manifest JSON file" },
  options: [
    { name: "entity", required: true, description: "Manifest key of the entity to run" },
    { name: "register", description: "Path to a module exporting register(registry) for custom entity types/actions" }
  ],
  action: async (rawData) => {
    const data = rawData;
    const registry = buildRegistry();
    await applyRegisterFile(registry, data.register);
    const manifest = loadManifest(data.manifest);
    const instances = await (0, import_kernel.resolve)(manifest, registry);
    const target = instances[data.entity];
    if (!target) {
      throw new Error(`"${data.entity}" is not an entity key in "${data.manifest}"`);
    }
    const result = await target.run(void 0);
    console.log(result);
  }
});
var paws = new import_command.Command({
  name: "paws",
  description: "The Panda CLI \u2014 resolve, validate, and run @panda/kernel manifests from the terminal.",
  version: "0.1.0",
  subcommands: [validateCommand, runCommand]
});
paws.run().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
