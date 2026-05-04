# Contributing

## Setup

```bash
bun install
bun run ci
```

## Releases

This repo uses [changesets](https://github.com/changesets/changesets). When you're ready, run `bun changeset` and follow the prompts. See [adding a changeset](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md#i-am-in-a-single-package-repository) for details.

## Scripts

- `bun run check` — Biome lint and format check
- `bun run check:write` — Biome auto-fix
- `bun run typecheck` — TypeScript across all packages
- `bun run knip` — dead-code check
- `bun run test` — unit tests
- `bun run ci` — runs all of the above
- `bun run dev` — watch mode across packages
