# @djs-commands/adapter-prisma

Prisma `Storage` adapter for djs-commands. Persists framework state (currently per-guild legacy prefix overrides; more models in slice #62) using a Prisma Client you've already generated for your own app.

## Install

```bash
bun add @djs-commands/core @djs-commands/adapter-prisma @prisma/client
bun add -D prisma
```

## Usage

1. Add the framework's model to your `schema.prisma`. You can either copy-paste the fragment below or import the string from the package:

   ```prisma
   model GuildPrefix {
       guildId String @id @map("guild_id")
       prefix  String

       @@map("guild_prefix")
   }
   ```

   Programmatic option (e.g. for codegen / docs):

   ```ts
   import { GUILD_PREFIX_PRISMA_MODEL } from "@djs-commands/adapter-prisma";
   console.log(GUILD_PREFIX_PRISMA_MODEL);
   ```

2. Run a migration so the table exists:

   ```bash
   bunx prisma migrate dev --name add_djs_commands_guild_prefix
   bunx prisma generate
   ```

3. Wire it up:

   ```ts
   import { prismaStorage } from "@djs-commands/adapter-prisma";
   import { PrismaClient } from "@prisma/client";

   const prisma = new PrismaClient();

   createCommandHandler({
       client,
       storage: prismaStorage(prisma),
       legacy: { enabled: true, defaultPrefix: "!" },
       // ...
   });
   ```

## Bring-your-own-delegate

If you've renamed the model in your schema, or want to share a delegate with other code, pass it explicitly:

```ts
import { GuildPrefixModel } from "@djs-commands/core";
import { prismaStorage } from "@djs-commands/adapter-prisma";

prismaStorage(prisma, { delegates: { [GuildPrefixModel]: prisma.myCustomModel } });
```

## Local development

Spin up Postgres for testing:

```bash
docker run --rm -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres bunx prisma migrate dev
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres bun test
```

The integration test suite skips cleanly if `DATABASE_URL` is unset, `@prisma/client` hasn't been generated, or Postgres is unreachable.
