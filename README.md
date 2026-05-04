# djs-commands

> Modern command handler for Discord.js — TypeScript-first, Components V2 native, with pluggable persistence.

**v2 is in active development.** v1 (`@d3oxy/djs-commands`) is preserved at the [`v1-final-commit` tag](https://github.com/D3OXY/djs-commands/tree/v1-final-commit).

## Quick start

```bash
git clone https://github.com/D3OXY/djs-commands
cd djs-commands
bun install
cp examples/minimal/.env.example examples/minimal/.env  # add DISCORD_TOKEN
bun run --cwd examples/minimal dev
```

## Packages

| Package | Description | Status |
|---|---|---|
| [`@djs-commands/core`](./packages/core) | Command dispatcher and core API | early bootstrap |

More packages coming — see [PRD #51](https://github.com/D3OXY/djs-commands/issues/51) and the [v2 roadmap](https://github.com/D3OXY/djs-commands/issues?q=is%3Aopen+label%3Aneeds-triage).

## Development

```bash
bun install
bun run ci      # check + typecheck + knip + test
bun run dev     # watch mode across packages
bun run check   # biome lint+format check
```

## License

MIT
