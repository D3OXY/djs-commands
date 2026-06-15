import type { AnyCommand } from "./types";

/** Cooldown key scope. Pick the smallest scope that matches the command's intent. */
export type CooldownType = "perUser" | "perGuild" | "perUserPerGuild" | "global";

/** Cooldown behavior for one command. */
export interface CooldownConfig {
	/** Keying strategy for the cooldown. */
	type: CooldownType;
	/** Duration in milliseconds */
	duration: number;
}

/** Identifies the actor (and optionally the guild) for cooldown key derivation. */
export interface CooldownActor {
	/** Discord user ID. */
	userId: string;
	/** Discord guild ID, or null outside guild context. */
	guildId: string | null;
}

/**
 * TTL-native cache contract for distributed cooldowns. Implement against any
 * KV store (Redis, Memcached) — `expiresAt` is a millisecond UNIX timestamp,
 * `ttlMs` is the hint for stores that take TTL directly (e.g. Redis SETEX).
 */
export interface CacheAdapter {
	/** Returns the absolute expiry timestamp (ms), or null if missing/expired. */
	get(key: string): Promise<number | null>;
	/** Stores an absolute expiry timestamp with a TTL hint for stores such as Redis. */
	set(key: string, expiresAt: number, ttlMs: number): Promise<void>;
	/** Removes one cooldown key. */
	delete(key: string): Promise<void>;
}

/** Applies command cooldown checks using memory or an optional shared `CacheAdapter`. */
export class CooldownEngine {
	private readonly memory = new Map<string, number>();
	private readonly cache?: CacheAdapter;

	constructor(cache?: CacheAdapter) {
		this.cache = cache;
	}

	/** Returns remaining ms if the command is on cooldown for this actor; null otherwise. */
	async check(command: AnyCommand, actor: CooldownActor): Promise<number | null> {
		if (!command.cooldown) return null;
		const key = makeKey(command, actor);
		const expiresAt = await this.read(key);
		if (expiresAt === null) return null;
		const now = Date.now();
		if (expiresAt > now) return expiresAt - now;
		await this.deleteKey(key);
		return null;
	}

	async start(command: AnyCommand, actor: CooldownActor): Promise<void> {
		if (!command.cooldown) return;
		const key = makeKey(command, actor);
		const expiresAt = Date.now() + command.cooldown.duration;
		await this.write(key, expiresAt, command.cooldown.duration);
	}

	private async read(key: string): Promise<number | null> {
		if (this.cache) return this.cache.get(key);
		return this.memory.get(key) ?? null;
	}

	private async write(key: string, expiresAt: number, ttlMs: number): Promise<void> {
		if (this.cache) {
			await this.cache.set(key, expiresAt, ttlMs);
			return;
		}
		this.memory.set(key, expiresAt);
	}

	private async deleteKey(key: string): Promise<void> {
		if (this.cache) {
			await this.cache.delete(key);
			return;
		}
		this.memory.delete(key);
	}
}

function makeKey(command: AnyCommand, actor: CooldownActor): string {
	const cooldown = command.cooldown;
	if (!cooldown) throw new Error("makeKey called on a command without a cooldown");
	const guildId = actor.guildId ?? "dm";
	switch (cooldown.type) {
		case "perUser":
			return `cd:${command.name}:user:${actor.userId}`;
		case "perGuild":
			return `cd:${command.name}:guild:${guildId}`;
		case "perUserPerGuild":
			return `cd:${command.name}:user:${actor.userId}:guild:${guildId}`;
		case "global":
			return `cd:${command.name}:global`;
	}
}
