import { expect, test } from "bun:test";
import { type CacheAdapter, CooldownEngine } from "./cooldowns";
import type { AnyCommand } from "./types";

const actor = (userId = "user-1", guildId: string | null = "guild-1") => ({ userId, guildId });

const cmd = (overrides: Partial<AnyCommand> = {}): AnyCommand => ({
	name: "test",
	description: "test",
	run: async () => {},
	...overrides,
});

test("check returns null when the command has no cooldown configured", async () => {
	const engine = new CooldownEngine();
	const result = await engine.check(cmd(), actor());
	expect(result).toBeNull();
});

test("check returns null before start is called", async () => {
	const engine = new CooldownEngine();
	const c = cmd({ cooldown: { type: "perUser", duration: 1000 } });
	const result = await engine.check(c, actor());
	expect(result).toBeNull();
});

test("check returns the remaining ms while inside the cooldown window", async () => {
	const engine = new CooldownEngine();
	const c = cmd({ cooldown: { type: "perUser", duration: 5_000 } });
	await engine.start(c, actor());
	const result = await engine.check(c, actor());
	expect(result).not.toBeNull();
	expect(result).toBeGreaterThan(0);
	expect(result).toBeLessThanOrEqual(5_000);
});

test("check returns null after the cooldown expires", async () => {
	const engine = new CooldownEngine();
	const c = cmd({ cooldown: { type: "perUser", duration: 1 } });
	await engine.start(c, actor());
	await new Promise((r) => setTimeout(r, 5));
	const result = await engine.check(c, actor());
	expect(result).toBeNull();
});

test("perUser: starting cooldown for one user does not block another user", async () => {
	const engine = new CooldownEngine();
	const c = cmd({ cooldown: { type: "perUser", duration: 5_000 } });
	await engine.start(c, actor("alice"));
	const aliceBlocked = await engine.check(c, actor("alice"));
	const bobBlocked = await engine.check(c, actor("bob"));
	expect(aliceBlocked).not.toBeNull();
	expect(bobBlocked).toBeNull();
});

test("perGuild: blocks every user in the same guild", async () => {
	const engine = new CooldownEngine();
	const c = cmd({ cooldown: { type: "perGuild", duration: 5_000 } });
	await engine.start(c, actor("alice", "guild-A"));
	const sameGuildOther = await engine.check(c, actor("bob", "guild-A"));
	const otherGuild = await engine.check(c, actor("alice", "guild-B"));
	expect(sameGuildOther).not.toBeNull();
	expect(otherGuild).toBeNull();
});

test("perUserPerGuild: blocks user X in guild A but not user X in guild B", async () => {
	const engine = new CooldownEngine();
	const c = cmd({ cooldown: { type: "perUserPerGuild", duration: 5_000 } });
	await engine.start(c, actor("alice", "guild-A"));
	const sameUserSameGuild = await engine.check(c, actor("alice", "guild-A"));
	const sameUserOtherGuild = await engine.check(c, actor("alice", "guild-B"));
	const otherUserSameGuild = await engine.check(c, actor("bob", "guild-A"));
	expect(sameUserSameGuild).not.toBeNull();
	expect(sameUserOtherGuild).toBeNull();
	expect(otherUserSameGuild).toBeNull();
});

test("global: blocks every user across all guilds", async () => {
	const engine = new CooldownEngine();
	const c = cmd({ cooldown: { type: "global", duration: 5_000 } });
	await engine.start(c, actor("alice", "guild-A"));
	const sameUserSameGuild = await engine.check(c, actor("alice", "guild-A"));
	const otherUserOtherGuild = await engine.check(c, actor("bob", "guild-B"));
	expect(sameUserSameGuild).not.toBeNull();
	expect(otherUserOtherGuild).not.toBeNull();
});

test("CacheAdapter: when provided, in-memory map is bypassed", async () => {
	const store = new Map<string, number>();
	let getCalls = 0;
	let setCalls = 0;
	const adapter: CacheAdapter = {
		get: async (k) => {
			getCalls++;
			return store.get(k) ?? null;
		},
		set: async (k, expiresAt) => {
			setCalls++;
			store.set(k, expiresAt);
		},
		delete: async (k) => {
			store.delete(k);
		},
	};

	const engine = new CooldownEngine(adapter);
	const c = cmd({ cooldown: { type: "perUser", duration: 5_000 } });
	await engine.start(c, actor());
	const remaining = await engine.check(c, actor());

	expect(setCalls).toBe(1);
	expect(getCalls).toBe(1);
	expect(remaining).not.toBeNull();
});

test("start is a no-op when the command has no cooldown configured", async () => {
	const engine = new CooldownEngine();
	await engine.start(cmd(), actor());
	const result = await engine.check(cmd(), actor());
	expect(result).toBeNull();
});
