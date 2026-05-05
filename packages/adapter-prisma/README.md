# @djs-commands/adapter-prisma

Prisma `Storage` adapter for [`@djs-commands/core`](https://www.npmjs.com/package/@djs-commands/core).

Persists the framework's three built-in models — **guild prefixes**, **disabled commands**, and **channel locks** — using a Prisma Client you've already generated for your own app.

📘 **Full walk-through: https://djscommands.deoxy.dev/adapter-cookbook#prisma**

## Install

```bash
bun add @djs-commands/core @djs-commands/adapter-prisma @prisma/client
bun add -d prisma
```

## Usage

1. Add the framework's models to your `schema.prisma`. Copy the fragment below, or import the schema strings:

   ```prisma
   model GuildPrefix {
     guildId String @id @map("guild_id")
     prefix  String

     @@map("guild_prefix")
   }

   model DisabledCommand {
     guildId     String @map("guild_id")
     commandName String @map("command_name")

     @@id([guildId, commandName])
     @@map("disabled_commands")
   }

   model ChannelLock {
     guildId     String @map("guild_id")
     commandName String @map("command_name")
     channelId   String @map("channel_id")

     @@id([guildId, commandName, channelId])
     @@map("channel_locks")
   }
   ```

   Programmatic option (e.g. for codegen / docs):

   ```ts
   import {
     GUILD_PREFIX_PRISMA_MODEL,
     DISABLED_COMMANDS_PRISMA_MODEL,
     CHANNEL_LOCKS_PRISMA_MODEL,
   } from "@djs-commands/adapter-prisma";
   ```

2. Run a migration so the tables exist:

   ```bash
   bunx prisma migrate dev --name add_djs_commands
   bunx prisma generate
   ```

3. Wire it up:

   ```ts
   import { prismaStorage } from "@djs-commands/adapter-prisma";
   import { PrismaClient } from "@prisma/client";

   const prisma = new PrismaClient();

   createCommandHandler({
     client,
     commands: [/* ... */],
     storage: prismaStorage(prisma),
   });
   ```

The dispatcher reads/writes `guild_prefix`, `disabled_commands`, and `channel_locks` automatically — you don't write any code for the framework models.

## Bring-your-own-delegates

If you've renamed the models in your schema, pass the delegates explicitly:

```ts
import { prismaStorage } from "@djs-commands/adapter-prisma";

prismaStorage(prisma, {
  delegates: { guildPrefix: prisma.myCustomModel },
});
```

## Local development

Spin up Postgres for testing:

```bash
docker run --rm -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres bunx prisma migrate dev
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres bun test
```

The integration test suite skips cleanly if `DATABASE_URL` is unset, `@prisma/client` hasn't been generated, or Postgres is unreachable — CI without Postgres will not fail.

## License

[MIT](https://github.com/D3OXY/djs-commands/blob/main/LICENSE) · Issues + discussions on [GitHub](https://github.com/D3OXY/djs-commands).
