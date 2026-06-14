# @djs-commands/adapter-prisma

Prisma `Storage` adapter for framework-owned djs-commands state.

Users own `schema.prisma`, migrations, model names, indexes, and Prisma Client lifecycle. This adapter only translates mapped framework models.

## Usage

```prisma
model GuildPrefix {
	guildId String @id @map("guild_id")
	prefix  String

	@@map("bot_prefixes")
}
```

```ts
import { prismaStorage, type PrismaDelegate } from "@djs-commands/adapter-prisma";
import { GuildPrefixModel } from "@djs-commands/core";

export const storage = prismaStorage({
	models: {
		[GuildPrefixModel]: {
			delegate: prisma.guildPrefix as PrismaDelegate,
			fields: { guild_id: "guildId", prefix: "prefix" },
		},
	},
});
```

Map only models for features you enable. Required logical fields:

- `GuildPrefixModel`: `guild_id`, `prefix`
- `DisabledCommandsModel`: `guild_id`, `command_name`
- `ChannelLocksModel`: `guild_id`, `command_name`, `channel_id`

Recommended unique constraints:

- guild prefixes: `guild_id`
- disabled commands: `guild_id`, `command_name`
- channel locks: `guild_id`, `command_name`, `channel_id`

Unknown or unmapped framework models throw loudly. The constructor validates mapping shape only; missing tables and field mistakes surface from Prisma/database operations.

## License

[MIT](https://github.com/D3OXY/djs-commands/blob/main/LICENSE)
