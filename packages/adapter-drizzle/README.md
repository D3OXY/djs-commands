# @djs-commands/adapter-drizzle

Drizzle/Postgres `Storage` adapter for framework-owned djs-commands state.

Users own schema, migrations, table names, column names, indexes, and DB connection lifecycle. This adapter only translates mapped framework models.

## Usage

```ts
import { drizzleStorage } from "@djs-commands/adapter-drizzle";
import { GuildPrefixModel } from "@djs-commands/core";
import { pgTable, text } from "drizzle-orm/pg-core";

export const guildPrefixes = pgTable("bot_prefixes", {
	guildId: text("guild_id").primaryKey(),
	value: text("prefix").notNull(),
});

export const storage = drizzleStorage(db, {
	models: {
		[GuildPrefixModel]: {
			table: guildPrefixes,
			fields: { guild_id: guildPrefixes.guildId, prefix: guildPrefixes.value },
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

Unknown or unmapped framework models throw loudly. The constructor validates mapping shape only; table existence and column mistakes surface from Drizzle/Postgres at operation time.

## License

[MIT](https://github.com/D3OXY/djs-commands/blob/main/LICENSE)
