# @djs-commands/adapter-prisma

## 3.0.0

### Major Changes

- d6013fc: Make storage schema user-owned. First-party adapters now require explicit framework model mappings and no longer export package-owned schemas/model factories. Core adds storage feature flags so disabled-command and channel-lock gates only query storage when enabled.

### Patch Changes

- Updated dependencies [94dac6a]
- Updated dependencies [d6013fc]
  - @djs-commands/core@3.0.0

## 2.0.1

### Patch Changes

- 50beb33: docs: refresh package READMEs

  - Drop pre-2.0 placeholder copy ("bootstrap-stage skeleton", "more models in slice #62", etc.) — every framework model ships today.
  - Link prominently to https://djscommands.deoxy.dev for concepts, recipes, and the adapter cookbook.
  - Fix `adapter-redis` README using `cache:` (handler option is `cacheAdapter`).
  - Document all three framework models (`guild_prefix`, `disabled_commands`, `channel_locks`) on every storage adapter README.
  - Add migration-guide and companion-package links throughout.

- Updated dependencies [50beb33]
  - @djs-commands/core@2.0.1

## 2.0.0

🎉 Initial v2.0.0 release.

Prisma `Storage` adapter. Persists per-guild legacy prefix overrides, disabled-commands kill switches, and channel locks for `@djs-commands/core`.

```ts
import { prismaStorage } from "@djs-commands/adapter-prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

createCommandHandler({
  client,
  storage: prismaStorage(prisma),
  legacy: { enabled: true, defaultPrefix: "!" },
});
```

- Schema fragment exported as `GUILD_PREFIX_PRISMA_MODEL`, `DISABLED_COMMANDS_PRISMA_MODEL`, `CHANNEL_LOCKS_PRISMA_MODEL` strings — paste into your `schema.prisma`, run `prisma migrate dev`
- Lazy delegate resolution — only looks up `prisma.<model>` when the model is actually used at runtime; users who only want `GuildPrefix` don't pay for delegate-existence checks on the others
- Peer dep `@prisma/client: ^5.0.0 || ^6.0.0 || ^7.0.0`
