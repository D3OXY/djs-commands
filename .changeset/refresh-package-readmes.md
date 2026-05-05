---
"@djs-commands/core": patch
"@djs-commands/jsx": patch
"create-djs-commands": patch
"@djs-commands/adapter-drizzle": patch
"@djs-commands/adapter-prisma": patch
"@djs-commands/adapter-mongoose": patch
"@djs-commands/adapter-redis": patch
---

docs: refresh package READMEs

- Drop pre-2.0 placeholder copy ("bootstrap-stage skeleton", "more models in slice #62", etc.) — every framework model ships today.
- Link prominently to https://djscommands.deoxy.dev for concepts, recipes, and the adapter cookbook.
- Fix `adapter-redis` README using `cache:` (handler option is `cacheAdapter`).
- Document all three framework models (`guild_prefix`, `disabled_commands`, `channel_locks`) on every storage adapter README.
- Add migration-guide and companion-package links throughout.
