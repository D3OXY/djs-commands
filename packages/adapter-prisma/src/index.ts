import { ChannelLocksModel, DisabledCommandsModel, GuildPrefixModel, type Storage, type StorageFindOpts, type StorageWhere } from "@djs-commands/core";

/**
 * Minimal structural shape of a generated Prisma Client. We only need the
 * delegate methods our adapter calls — typing it this loosely avoids a hard
 * dependency on `@prisma/client`'s generated types (which only exist after
 * the user runs `prisma generate` in their own project).
 */
type PrismaDelegate = {
	create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
	findFirst: (args: { where: Record<string, unknown> }) => Promise<Record<string, unknown> | null>;
	findMany: (args: { where?: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc">; take?: number; skip?: number }) => Promise<Record<string, unknown>[]>;
	updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<{ count: number }>;
	deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }>;
	count: (args: { where?: Record<string, unknown> }) => Promise<number>;
};

export type PrismaClientLike = Record<string, unknown>;

interface ModelDelegates {
	[GuildPrefixModel]: PrismaDelegate;
	[DisabledCommandsModel]: PrismaDelegate;
	[ChannelLocksModel]: PrismaDelegate;
}

interface PrismaStorageOptions {
	/**
	 * Optional override of the Prisma delegate used for each framework model.
	 * Defaults to looking up the camelCase delegate on the client (e.g.
	 * `prisma.guildPrefix` for the `guild_prefix` model).
	 */
	delegates?: Partial<ModelDelegates>;
}

/**
 * Prisma model fragment for the framework's GuildPrefix model. Copy-paste this
 * into your `schema.prisma`, run `prisma migrate dev`, and you're set.
 *
 * Also available as a file at `node_modules/@djs-commands/adapter-prisma/src/schema.prisma.txt`.
 */
export const GUILD_PREFIX_PRISMA_MODEL = `model GuildPrefix {
    guildId String @id @map("guild_id")
    prefix  String

    @@map("guild_prefix")
}
`;

export const DISABLED_COMMANDS_PRISMA_MODEL = `model DisabledCommand {
    guildId     String @map("guild_id")
    commandName String @map("command_name")

    @@id([guildId, commandName])
    @@map("disabled_commands")
}
`;

export const CHANNEL_LOCKS_PRISMA_MODEL = `model ChannelLock {
    guildId     String @map("guild_id")
    commandName String @map("command_name")
    channelId   String @map("channel_id")

    @@id([guildId, commandName, channelId])
    @@map("channel_locks")
}
`;

/**
 * Returns a `Storage` implementation backed by a Prisma Client. Models the
 * framework knows about (currently only GuildPrefix) are looked up on the
 * client by their camelCase delegate name (e.g. `prisma.guildPrefix`).
 * Unknown models throw — adapters that don't recognize a model name should
 * fail loud, not silently no-op.
 *
 * Bring-your-own-delegate: pass `options.delegates` to override the default
 * lookup if you've renamed the model in your schema.
 */
export function prismaStorage(prisma: PrismaClientLike, options: PrismaStorageOptions = {}): Storage {
	const overrides = options.delegates ?? {};
	const cache = new Map<string, PrismaDelegate>();

	// Lazy delegate resolution — we only look up a delegate when the model is
	// actually used at runtime. This avoids requiring every Prisma client we
	// touch to have all framework models generated; users that only use
	// GuildPrefix don't pay for DisabledCommands / ChannelLocks delegate
	// existence checks at construction time.
	const delegateFor = (model: string): PrismaDelegate => {
		const cached = cache.get(model);
		if (cached) return cached;
		if (model === GuildPrefixModel || model === DisabledCommandsModel || model === ChannelLocksModel) {
			const override = overrides[model as keyof ModelDelegates];
			const resolved = override ?? resolveDelegate(prisma, prismaDelegateName(model));
			cache.set(model, resolved);
			return resolved;
		}
		throw new Error(`@djs-commands/adapter-prisma: unknown model "${model}"`);
	};

	return {
		async create(model, data) {
			const delegate = delegateFor(model);
			const row = await delegate.create({ data: mapKeys(data as Record<string, unknown>) });
			return unmapKeys(row) as never;
		},
		async findOne(model, where) {
			const delegate = delegateFor(model);
			const row = await delegate.findFirst({ where: mapKeys(where) });
			return row ? (unmapKeys(row) as never) : null;
		},
		async findMany(model, opts: StorageFindOpts = {}) {
			const delegate = delegateFor(model);
			const args: Parameters<PrismaDelegate["findMany"]>[0] = {};
			if (opts.where) args.where = mapKeys(opts.where);
			if (opts.orderBy) {
				args.orderBy = { [mapColumn(opts.orderBy.field)]: opts.orderBy.direction };
			}
			if (opts.limit !== undefined) args.take = opts.limit;
			if (opts.offset !== undefined) args.skip = opts.offset;
			const rows = await delegate.findMany(args);
			return rows.map((r) => unmapKeys(r)) as never;
		},
		async update(model, where, data) {
			const delegate = delegateFor(model);
			const mappedWhere = mapKeys(where);
			// `updateMany` accepts any filter (Prisma's `update` requires a unique
			// constraint), then we re-fetch a representative row. Matches drizzle
			// adapter semantics where `update` accepts any `StorageWhere`.
			const result = await delegate.updateMany({
				where: mappedWhere,
				data: mapKeys(data as Record<string, unknown>),
			});
			if (result.count === 0) {
				throw new Error(`@djs-commands/adapter-prisma: no row matched update for model "${model}"`);
			}
			const row = await delegate.findFirst({ where: mappedWhere });
			if (!row) {
				throw new Error(`@djs-commands/adapter-prisma: row vanished after update for model "${model}"`);
			}
			return unmapKeys(row) as never;
		},
		async delete(model, where) {
			const delegate = delegateFor(model);
			await delegate.deleteMany({ where: mapKeys(where) });
		},
		async count(model, where) {
			const delegate = delegateFor(model);
			const args: Parameters<PrismaDelegate["count"]>[0] = {};
			if (where) args.where = mapKeys(where as StorageWhere);
			return await delegate.count(args);
		},
	};
}

/**
 * The Prisma delegate name for each framework model. We can't just snake→camel
 * the model name because the framework's plural/singular doesn't always match
 * Prisma's convention (e.g. `disabled_commands` model → `disabledCommand`
 * delegate per the Prisma model fragment we ship).
 */
function prismaDelegateName(model: string): string {
	if (model === GuildPrefixModel) return "guildPrefix";
	if (model === DisabledCommandsModel) return "disabledCommand";
	if (model === ChannelLocksModel) return "channelLock";
	return snakeToCamel(model);
}

/**
 * Reads a Prisma delegate by camelCase name from the client. Throws loud if
 * the delegate isn't on the client (means the model wasn't merged into
 * `schema.prisma` or the client wasn't regenerated).
 */
function resolveDelegate(prisma: PrismaClientLike, key: string): PrismaDelegate {
	const delegate = (prisma as Record<string, unknown>)[key];
	if (!delegate || typeof delegate !== "object") {
		throw new Error(`@djs-commands/adapter-prisma: Prisma client has no delegate for "prisma.${key}"`);
	}
	return delegate as PrismaDelegate;
}

// Prisma's TS-side field names use camelCase while the database uses
// snake_case via @map. The framework's API uses snake_case, so translate at
// the boundary.
function mapColumn(name: string): string {
	return snakeToCamel(name);
}

function mapKeys(obj: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj)) out[mapColumn(k)] = v;
	return out;
}

function unmapKeys(obj: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj)) out[camelToSnake(k)] = v;
	return out;
}

function snakeToCamel(input: string): string {
	return input.replace(/_([a-z])/g, (_match, ch: string) => ch.toUpperCase());
}

function camelToSnake(input: string): string {
	return input.replace(/([A-Z])/g, (_match, ch: string) => `_${ch.toLowerCase()}`);
}
