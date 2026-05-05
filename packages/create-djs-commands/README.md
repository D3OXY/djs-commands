# create-djs-commands

Scaffolding CLI for [djs-commands](https://djscommands.deoxy.dev) — pick a template, answer a few prompts, get a working Discord bot.

```bash
npx create-djs-commands my-bot
# or
bunx create-djs-commands my-bot
# or
pnpm dlx create-djs-commands my-bot
```

📘 **Full documentation: https://djscommands.deoxy.dev/getting-started**

## What gets scaffolded

- `package.json` with the right dependencies for your adapter and package manager
- `tsconfig.json` (strict, ESM, Bundler resolution)
- `src/index.ts` wired to `createCommandHandler`
- `src/commands/ping.ts` as a starting command
- `.env.example`, `.gitignore`, `README.md`

The bot uses fs-autoloader (`commandDir`), so any new file under `src/commands/` auto-registers on save in dev mode.

## Non-interactive mode

Pass flags to skip prompts:

```bash
npx create-djs-commands my-bot \
  --adapter drizzle \
  --legacy \
  --components-v2 \
  --package-manager bun
```

| Flag | Values | Default |
|---|---|---|
| `--adapter` | `drizzle` / `prisma` / `mongoose` / `none` | wizard |
| `--legacy` | (boolean — enable prefix commands) | `false` |
| `--components-v2` | (boolean — install `@djs-commands/jsx`) | `false` |
| `--package-manager`, `--pm` | `bun` / `pnpm` / `npm` | `bun` |
| `--no-git` | (boolean — skip `git init`) | `false` |
| `--skip-install` | (boolean — skip dependency install) | `false` |
| `-h`, `--help` | | |

## Next steps

Once your bot is scaffolded:

```bash
cd my-bot
cp .env.example .env  # add your DISCORD_TOKEN
bun run dev
```

Then read:
- [Concepts](https://djscommands.deoxy.dev/concepts) — the mental model.
- [Recipes](https://djscommands.deoxy.dev/recipes) — copy-paste patterns.
- [Adapter Cookbook](https://djscommands.deoxy.dev/adapter-cookbook) — wiring up your DB.

## License

[MIT](https://github.com/D3OXY/djs-commands/blob/main/LICENSE) · Issues + discussions on [GitHub](https://github.com/D3OXY/djs-commands).
