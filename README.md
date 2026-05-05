# djs-commands

> Modern command handler for Discord.js — TypeScript-first, Components V2 native, with pluggable persistence.

## Coming from v1 (`@d3oxy/djs-commands`)?

The v1 package is preserved at the [`v1-final-commit` tag](https://github.com/D3OXY/djs-commands/tree/v1-final-commit) and stays on npm under `@d3oxy/djs-commands@1.4.x`. To upgrade to v2, follow the [Migration from v1](https://djscommands.deoxy.dev/migration-from-v1) guide — every v1 API has a v2 equivalent (with side-by-side examples).

## Quick start

```bash
npx create-djs-commands my-bot
cd my-bot
cp .env.example .env  # add DISCORD_TOKEN
bun run dev
```

Or scaffold by hand from the [Getting Started guide](https://djscommands.deoxy.dev/getting-started).

## Packages

| Package | Description |
|---|---|
| [`@djs-commands/core`](./packages/core) | Command dispatcher, definitions, validators, plugins, fs-autoloader |
| [`@djs-commands/jsx`](./packages/jsx) | Components V2 JSX runtime (opt-in) |
| [`create-djs-commands`](./packages/create-djs-commands) | `npx create-djs-commands` scaffolding tool |
| [`@djs-commands/adapter-drizzle`](./packages/adapter-drizzle) | Drizzle/Postgres `Storage` adapter |
| [`@djs-commands/adapter-prisma`](./packages/adapter-prisma) | Prisma `Storage` adapter |
| [`@djs-commands/adapter-mongoose`](./packages/adapter-mongoose) | Mongoose `Storage` adapter (v1 continuity path) |
| [`@djs-commands/adapter-redis`](./packages/adapter-redis) | Redis `CacheAdapter` for distributed cooldowns |

## Development

```bash
bun install
bun run ci      # check + typecheck + knip + test
bun run dev     # watch mode across packages
bun run check   # biome lint+format check
```

## License

MIT
