import type { ChatInputCommandInteraction } from "discord.js";
import type { AnyCommand } from "./types";

export type CooldownType = "perUser" | "perGuild" | "perUserPerGuild" | "global";

export interface CooldownConfig {
	type: CooldownType;
	/** Duration in milliseconds */
	duration: number;
}

/**
 * TTL-native cache contract for distributed cooldowns. Implement against any
 * KV store (Redis, Memcached) — `expiresAt` is a millisecond UNIX timestamp,
 * `ttlMs` is the hint for stores that take TTL directly (e.g. Redis SETEX).
 */
export interface CacheAdapter {
	/** Returns the absolute expiry timestamp (ms), or null if missing/expired. */
	get(key: string): Promise<number | null>;
	set(key: string, expiresAt: number, ttlMs: number): Promise<void>;
	delete(key: string): Promise<void>;
}

export class CooldownEngine {
	private readonly memory = new Map<string, number>();
	private readonly cache?: CacheAdapter;

	constructor(cache?: CacheAdapter) {
		this.cache = cache;
	}

	/**
	 * Returns the remaining cooldown in ms if the command is on cooldown for this
	 * interaction's actor; null otherwise (no cooldown configured, never started,
	 * or already expired).
	 */
	async check(command: AnyCommand, interaction: ChatInputCommandInteraction): Promise<number | null> {
		if (!command.cooldown) return null;
		const key = makeKey(command, interaction);
		const expiresAt = await this.read(key);
		if (expiresAt === null) return null;
		const now = Date.now();
		if (expiresAt > now) return expiresAt - now;
		await this.deleteKey(key);
		return null;
	}

	async start(command: AnyCommand, interaction: ChatInputCommandInteraction): Promise<void> {
		if (!command.cooldown) return;
		const key = makeKey(command, interaction);
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

function makeKey(command: AnyCommand, interaction: ChatInputCommandInteraction): string {
	const cooldown = command.cooldown;
	if (!cooldown) throw new Error("makeKey called on a command without a cooldown");
	const userId = interaction.user.id;
	const guildId = interaction.guildId ?? "dm";
	switch (cooldown.type) {
		case "perUser":
			return `cd:${command.name}:user:${userId}`;
		case "perGuild":
			return `cd:${command.name}:guild:${guildId}`;
		case "perUserPerGuild":
			return `cd:${command.name}:user:${userId}:guild:${guildId}`;
		case "global":
			return `cd:${command.name}:global`;
	}
}
