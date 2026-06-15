/**
 * Generic CRUD contract that adapters implement once and the framework
 * consumes for every persistent feature. Modeled on Better Auth's pattern —
 * adding a new model never requires changes to the adapter contract.
 *
 * `Storage.create<T>` returns the persisted row (most ORMs do this via
 * RETURNING). Adapters that don't support returning should re-fetch.
 */
export interface Storage {
	/** Optional non-DB capability check used by handler boot for enabled storage-backed features. */
	assertModels?: (models: readonly FrameworkStorageModel[]) => void;
	/** Inserts a logical framework row and returns it in logical field names. */
	create<T extends Record<string, unknown>>(model: string, data: T): Promise<T>;
	/** Finds the first logical row matching equality-only filters, or null. */
	findOne<T extends Record<string, unknown>>(model: string, where: StorageWhere): Promise<T | null>;
	/** Finds logical rows with optional equality filters, pagination, and ordering. */
	findMany<T extends Record<string, unknown>>(model: string, opts?: StorageFindOpts): Promise<T[]>;
	/** Updates logical fields on matching rows and returns the updated logical row. */
	update<T extends Record<string, unknown>>(model: string, where: StorageWhere, data: Partial<T>): Promise<T>;
	/** Deletes rows matching equality-only filters. */
	delete(model: string, where: StorageWhere): Promise<void>;
	/** Counts rows matching optional equality-only filters. */
	count(model: string, where?: StorageWhere): Promise<number>;
}

/** Equality-only filter object using djs-commands logical field names. */
export type StorageWhere = Record<string, string | number | null>;

/** Query options for `Storage.findMany`. */
export interface StorageFindOpts {
	/** Equality-only filters in logical field names. */
	where?: StorageWhere;
	/** Maximum number of rows to return. */
	limit?: number;
	/** Number of rows to skip before returning results. */
	offset?: number;
	/** Logical field and direction to order by. */
	orderBy?: { field: string; direction: "asc" | "desc" };
}

/** Built-in framework model names that adapters can map. Apps own the real tables/models and migrations. */
export type FrameworkStorageModel = typeof GuildPrefixModel | typeof DisabledCommandsModel | typeof ChannelLocksModel;

/** Required logical fields for each framework model. Adapter mappings must provide these names. */
export const FrameworkStorageModelFields: Record<FrameworkStorageModel, readonly string[]> = {
	guild_prefix: ["guild_id", "prefix"],
	disabled_commands: ["guild_id", "command_name"],
	channel_locks: ["guild_id", "command_name", "channel_id"],
};

/** Throws when an adapter mapping omits a required logical field. */
export function assertRequiredStorageFields(model: string, fields: ReadonlySet<string>, adapterName: string): void {
	const requiredFields = (FrameworkStorageModelFields as Record<string, readonly string[]>)[model];
	if (!requiredFields) {
		throw new Error(`${adapterName}: unknown framework model "${model}"`);
	}
	for (const field of requiredFields) {
		if (!fields.has(field)) {
			throw new Error(`${adapterName}: model "${model}" is missing required field mapping "${field}"`);
		}
	}
}

// ─── GuildPrefix model ─────────────────────────────────────────────────────

/** Logical model name for per-guild legacy prefix overrides. */
export const GuildPrefixModel = "guild_prefix" as const;

/** Logical row shape for per-guild legacy prefix overrides. */
export interface GuildPrefixRow extends Record<string, unknown> {
	/** Discord guild ID. */
	guild_id: string;
	/** Prefix override for that guild. */
	prefix: string;
}

/** Reads a guild's persisted prefix override; null if no override is set. */
export async function getGuildPrefix(storage: Storage, guildId: string): Promise<string | null> {
	const row = await storage.findOne<GuildPrefixRow>(GuildPrefixModel, { guild_id: guildId });
	return row?.prefix ?? null;
}

/** Upserts a guild's prefix override. Pass an empty string or null to clear it. */
export async function setGuildPrefix(storage: Storage, guildId: string, prefix: string): Promise<void> {
	const existing = await storage.findOne<GuildPrefixRow>(GuildPrefixModel, { guild_id: guildId });
	if (existing) {
		await storage.update<GuildPrefixRow>(GuildPrefixModel, { guild_id: guildId }, { prefix });
	} else {
		await storage.create<GuildPrefixRow>(GuildPrefixModel, { guild_id: guildId, prefix });
	}
}

/** Clears a guild's persisted prefix override. */
export async function clearGuildPrefix(storage: Storage, guildId: string): Promise<void> {
	await storage.delete(GuildPrefixModel, { guild_id: guildId });
}

// ─── DisabledCommands model ────────────────────────────────────────────────

/** Logical model name for per-guild disabled command rows. */
export const DisabledCommandsModel = "disabled_commands" as const;

/** Logical row shape for a command disabled in one guild. */
export interface DisabledCommandRow extends Record<string, unknown> {
	/** Discord guild ID. */
	guild_id: string;
	/** Command name disabled in the guild. */
	command_name: string;
}

/** Returns true if the named command is disabled for the given guild. */
export async function isCommandDisabled(storage: Storage, guildId: string, commandName: string): Promise<boolean> {
	const row = await storage.findOne<DisabledCommandRow>(DisabledCommandsModel, {
		guild_id: guildId,
		command_name: commandName,
	});
	return row !== null;
}

/** Disables a command in one guild. No-op when the row already exists. */
export async function disableCommand(storage: Storage, guildId: string, commandName: string): Promise<void> {
	const existing = await storage.findOne<DisabledCommandRow>(DisabledCommandsModel, {
		guild_id: guildId,
		command_name: commandName,
	});
	if (existing) return;
	await storage.create<DisabledCommandRow>(DisabledCommandsModel, {
		guild_id: guildId,
		command_name: commandName,
	});
}

/** Re-enables a command in one guild by deleting its disabled row. */
export async function enableCommand(storage: Storage, guildId: string, commandName: string): Promise<void> {
	await storage.delete(DisabledCommandsModel, {
		guild_id: guildId,
		command_name: commandName,
	});
}

// ─── ChannelLocks model ────────────────────────────────────────────────────

/** Logical model name for command channel allow-lists. */
export const ChannelLocksModel = "channel_locks" as const;

/** Logical row shape for one command-to-channel lock. */
export interface ChannelLockRow extends Record<string, unknown> {
	/** Discord guild ID. */
	guild_id: string;
	/** Command name restricted by this row. */
	command_name: string;
	/** Discord channel ID where the command is allowed. */
	channel_id: string;
}

/**
 * Returns the list of channel IDs the named command is locked to in the given
 * guild. An empty array means no lock — the command runs anywhere (subject to
 * other validators). Non-empty means the command ONLY runs in those channels.
 */
export async function getChannelLocks(storage: Storage, guildId: string, commandName: string): Promise<string[]> {
	const rows = await storage.findMany<ChannelLockRow>(ChannelLocksModel, {
		where: { guild_id: guildId, command_name: commandName },
	});
	return rows.map((r) => r.channel_id);
}

/** Adds one allowed channel for a command in a guild. No-op when the row already exists. */
export async function lockCommandToChannel(storage: Storage, guildId: string, commandName: string, channelId: string): Promise<void> {
	const existing = await storage.findOne<ChannelLockRow>(ChannelLocksModel, {
		guild_id: guildId,
		command_name: commandName,
		channel_id: channelId,
	});
	if (existing) return;
	await storage.create<ChannelLockRow>(ChannelLocksModel, {
		guild_id: guildId,
		command_name: commandName,
		channel_id: channelId,
	});
}

/** Removes one allowed channel for a command in a guild. */
export async function unlockCommandFromChannel(storage: Storage, guildId: string, commandName: string, channelId: string): Promise<void> {
	await storage.delete(ChannelLocksModel, {
		guild_id: guildId,
		command_name: commandName,
		channel_id: channelId,
	});
}
