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
	create<T extends Record<string, unknown>>(model: string, data: T): Promise<T>;
	findOne<T extends Record<string, unknown>>(model: string, where: StorageWhere): Promise<T | null>;
	findMany<T extends Record<string, unknown>>(model: string, opts?: StorageFindOpts): Promise<T[]>;
	update<T extends Record<string, unknown>>(model: string, where: StorageWhere, data: Partial<T>): Promise<T>;
	delete(model: string, where: StorageWhere): Promise<void>;
	count(model: string, where?: StorageWhere): Promise<number>;
}

export type StorageWhere = Record<string, string | number | null>;

export interface StorageFindOpts {
	where?: StorageWhere;
	limit?: number;
	offset?: number;
	orderBy?: { field: string; direction: "asc" | "desc" };
}

export type FrameworkStorageModel = typeof GuildPrefixModel | typeof DisabledCommandsModel | typeof ChannelLocksModel;

export const FrameworkStorageModelFields: Record<FrameworkStorageModel, readonly string[]> = {
	guild_prefix: ["guild_id", "prefix"],
	disabled_commands: ["guild_id", "command_name"],
	channel_locks: ["guild_id", "command_name", "channel_id"],
};

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

export const GuildPrefixModel = "guild_prefix" as const;

export interface GuildPrefixRow extends Record<string, unknown> {
	guild_id: string;
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

export async function clearGuildPrefix(storage: Storage, guildId: string): Promise<void> {
	await storage.delete(GuildPrefixModel, { guild_id: guildId });
}

// ─── DisabledCommands model ────────────────────────────────────────────────

export const DisabledCommandsModel = "disabled_commands" as const;

export interface DisabledCommandRow extends Record<string, unknown> {
	guild_id: string;
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

export async function enableCommand(storage: Storage, guildId: string, commandName: string): Promise<void> {
	await storage.delete(DisabledCommandsModel, {
		guild_id: guildId,
		command_name: commandName,
	});
}

// ─── ChannelLocks model ────────────────────────────────────────────────────

export const ChannelLocksModel = "channel_locks" as const;

export interface ChannelLockRow extends Record<string, unknown> {
	guild_id: string;
	command_name: string;
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

export async function unlockCommandFromChannel(storage: Storage, guildId: string, commandName: string, channelId: string): Promise<void> {
	await storage.delete(ChannelLocksModel, {
		guild_id: guildId,
		command_name: commandName,
		channel_id: channelId,
	});
}
