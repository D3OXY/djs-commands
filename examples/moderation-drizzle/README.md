# moderation-drizzle

Example moderation bot using `@djs-commands/adapter-drizzle` for persistent state (per-guild legacy prefix overrides).

## Quick start

```bash
# 1. Postgres
docker run --rm -p 5432:5432 -e POSTGRES_PASSWORD=postgres -d postgres:16

# 2. Env
cp .env.example .env  # fill in DISCORD_TOKEN

# 3. Push the schema (creates the guild_prefix table)
bunx drizzle-kit push --schema=node_modules/@djs-commands/adapter-drizzle/dist/schema.js --dialect=postgresql --url=$DATABASE_URL

# 4. Run
bun run dev
```

`/ban` and `/kick` work via slash; `!ban` and `!kick` work via prefix once `legacy.enabled` is set. Per-guild prefix overrides are stored in the `guild_prefix` table and resolved on every message (cache later).
