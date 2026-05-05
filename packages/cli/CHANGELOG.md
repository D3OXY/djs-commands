# @djs-commands/cli

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
