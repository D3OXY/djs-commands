# @djs-commands/cli

Scaffolding CLI for djs-commands v2.

## Quick start

```bash
npx create-djs-commands my-bot
# or
bunx create-djs-commands my-bot
# or
pnpm dlx create-djs-commands my-bot
```

Runs an interactive wizard. Pass flags to skip prompts:

```bash
npx create-djs-commands my-bot \
  --adapter drizzle \
  --legacy \
  --components-v2 \
  --package-manager bun
```

## Flags

| Flag | Values | Default |
|---|---|---|
| `--adapter` | `drizzle` / `prisma` / `mongoose` / `none` | wizard |
| `--legacy` | (boolean) | `false` |
| `--components-v2` | (boolean) | `false` |
| `--package-manager`, `--pm` | `bun` / `pnpm` / `npm` | `bun` |
| `--no-git` | (boolean) | `false` |
| `--skip-install` | (boolean) | `false` |
| `-h`, `--help` | | |

## What gets scaffolded

- `package.json` with the right dependencies for your adapter and package manager
- `tsconfig.json` (strict, ESM, Bundler resolution)
- `src/index.ts` wired to `createCommandHandler`
- `src/commands/ping.ts` as a starting command
- `.env.example`, `.gitignore`, `README.md`

The bot uses fs-autoloader (`commandDir`), so any new file under `src/commands/` auto-registers on save in dev mode.
