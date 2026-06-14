# create-djs-commands

## 3.0.0

### Patch Changes

- 94dac6a: Add explicit global and guild command registration sync controls.
- d6013fc: Make storage schema user-owned. First-party adapters now require explicit framework model mappings and no longer export package-owned schemas/model factories. Core adds storage feature flags so disabled-command and channel-lock gates only query storage when enabled.

## 2.0.1

### Patch Changes

- 50beb33: docs: refresh package READMEs

  - Drop pre-2.0 placeholder copy ("bootstrap-stage skeleton", "more models in slice #62", etc.) — every framework model ships today.
  - Link prominently to https://djscommands.deoxy.dev for concepts, recipes, and the adapter cookbook.
  - Fix `adapter-redis` README using `cache:` (handler option is `cacheAdapter`).
  - Document all three framework models (`guild_prefix`, `disabled_commands`, `channel_locks`) on every storage adapter README.
  - Add migration-guide and companion-package links throughout.

## 2.0.0

🎉 Initial v2.0.0 release.

The `create-djs-commands` scaffolding tool.

```bash
npx create-djs-commands my-bot
```

Or non-interactive with flags:

```bash
npx create-djs-commands my-bot \
  --adapter drizzle \
  --legacy \
  --components-v2 \
  --pm bun
```

- Interactive wizard via `@clack/prompts`
- Flags: `--adapter <drizzle|prisma|mongoose|none>`, `--legacy`, `--components-v2`, `--pm <bun|pnpm|npm>`, `--no-git`, `--skip-install`
- Composable templates — base bot + adapter overlays + Components V2 + package-manager-specific scripts
- Node-runnable (built via `bun build --target=node`); works with `npx`, `pnpm dlx`, `bunx`
