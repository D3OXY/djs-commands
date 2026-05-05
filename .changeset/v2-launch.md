---
"@djs-commands/core": major
"@djs-commands/jsx": major
"@djs-commands/cli": major
"@djs-commands/adapter-drizzle": major
"@djs-commands/adapter-prisma": major
"@djs-commands/adapter-mongoose": major
"@djs-commands/adapter-redis": major
---

🎉 Initial v2.0.0 release.

A complete rewrite under the new `@djs-commands/*` npm org. v1 (`@d3oxy/djs-commands`) is preserved at the [`v1-final-commit` tag](https://github.com/D3OXY/djs-commands/tree/v1-final-commit) and stays on npm under `@d3oxy/djs-commands@1.4.x` — see the [migration guide](https://djscommands.deoxy.dev/migration-from-v1) to upgrade.

What's new:

- **Modern API surface** — function-based `defineCommand` with full TypeScript inference of run-handler arguments from the option schema
- **Pluggable persistence** — `Storage` contract with first-party adapters for [Drizzle](https://www.npmjs.com/package/@djs-commands/adapter-drizzle), [Prisma](https://www.npmjs.com/package/@djs-commands/adapter-prisma), and [Mongoose](https://www.npmjs.com/package/@djs-commands/adapter-mongoose) (the v1 continuity path)
- **Components V2** — first-class JSX runtime in [`@djs-commands/jsx`](https://www.npmjs.com/package/@djs-commands/jsx) plus a function-API fallback in core
- **Plugin system** — factory functions returning manifests with `setup`/`teardown` hooks; replaces v1's FeaturesHandler
- **Cooldowns** — 4 types in-memory by default; plug [`@djs-commands/adapter-redis`](https://www.npmjs.com/package/@djs-commands/adapter-redis) for distributed/sharded bots
- **Legacy prefix mode** — opt-in via `legacy: { enabled, defaultPrefix }`; one `defineCommand` definition serves slash + prefix
- **fs-autoloader + hot reload** — `commandDir` / `eventDir` walk recursively; dev mode hot-reloads files on save
- **Storage gates** — per-guild kill switches (`DisabledCommands`) and per-command channel allow-lists (`ChannelLocks`) flow through any adapter
- **CLI** — `npx create-djs-commands my-bot` scaffolds a working baseline with adapter / legacy / Components V2 / package-manager flags
- **discord.js** — peer dep `^14.26.0`, structured for v15 readiness

Built on Bun + Turbo + Biome + Knip; tested across `{node-22, node-24, bun-latest} × {ubuntu, macos}` matrix in CI.
