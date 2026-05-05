# @djs-commands/adapter-prisma

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
