# @djs-commands/core

## 2.0.0

🎉 Initial v2.0.0 release.

A complete rewrite under the new `@djs-commands/*` npm org. v1 (`@d3oxy/djs-commands`) is preserved at the [`v1-final-commit` tag](https://github.com/D3OXY/djs-commands/tree/v1-final-commit) and stays on npm under `@d3oxy/djs-commands@1.4.x` — see the [migration guide](https://djscommands.deoxy.dev/migration-from-v1) to upgrade.

### What's in core

- **`defineCommand`** — function-based command definition with full TypeScript inference of `run` handler arguments from the option schema (9 option types, required/optional, choices narrow to literal unions).
- **Unified `ctx`** — one `defineCommand` definition serves slash and legacy prefix invocations; the framework normalizes `interaction` and `message` into a `ctx` with `reply` / `author` / `guild` / `member` / `channel` / `options` and a `type: "slash" | "legacy"` discriminator.
- **Validators** — built-in `ownerOnly` / `guildOnly` / `channelOnly` / `permissions` / `roles`, plus pluggable global + per-command validators and a top-level `canRunCommand` hook for dynamic gating.
- **Cooldowns** — 4 types (`perUser`, `perGuild`, `perUserPerGuild`, `global`) backed by an in-memory map; plug a `CacheAdapter` for distributed bots.
- **Plugins** — factory functions returning manifests with `setup`/`teardown` lifecycle hooks; replaces v1's FeaturesHandler.
- **Storage** — generic CRUD `Storage` contract for persistent state (per-guild legacy prefix, disabled-commands kill switches, channel locks). Adapters for Drizzle / Prisma / Mongoose live in sibling packages.
- **fs-autoloader + hot reload** — `commandDir` and `eventDir` walk recursively; `dev` mode hot-reloads on save.
- **Legacy prefix mode** — opt-in via `legacy: { enabled, defaultPrefix }`; per-guild overrides flow through `Storage`.
- **Components V2 fallback** — function-API helpers (`container`, `section`, `actionRow`, `button`, `modal`, …) for users who don't want JSX. Pair with `@djs-commands/jsx` for the JSX runtime.

`discord.js` peer dep `^14.26.0`, structured for v15 readiness.
