# @djs-commands/adapter-mongoose

Mongoose `Storage` adapter for framework-owned djs-commands state.

Users own schemas, indexes, model names, and connection lifecycle. This adapter only translates mapped framework models.

## Usage

```ts
import { mongooseStorage } from "@djs-commands/adapter-mongoose";
import { GuildPrefixModel } from "@djs-commands/core";
import mongoose from "mongoose";

export const GuildPrefix = mongoose.model(
	"BotPrefix",
	new mongoose.Schema({
		guildId: { type: String, required: true, unique: true },
		value: { type: String, required: true },
	})
);

export const storage = mongooseStorage({
	models: {
		[GuildPrefixModel]: {
			model: GuildPrefix as mongoose.Model<Record<string, unknown>>,
			fields: { guild_id: "guildId", prefix: "value" },
		},
	},
});
```

Map only models for features you enable. Required logical fields:

- `GuildPrefixModel`: `guild_id`, `prefix`
- `DisabledCommandsModel`: `guild_id`, `command_name`
- `ChannelLocksModel`: `guild_id`, `command_name`, `channel_id`

Recommended unique indexes:

- guild prefixes: `guild_id`
- disabled commands: `guild_id`, `command_name`
- channel locks: `guild_id`, `command_name`, `channel_id`

Unknown or unmapped framework models throw loudly. The constructor validates mapping shape only; collection/index/field mistakes surface from Mongoose/MongoDB at operation time.

## License

[MIT](https://github.com/D3OXY/djs-commands/blob/main/LICENSE)
