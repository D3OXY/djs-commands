import { expect, test } from "bun:test";
import type { ChatInputCommandInteraction, Guild, GuildMember, User } from "discord.js";
import type { AnyCommand } from "./types";
import { runValidatorChain, type Validator, type ValidatorContext } from "./validators";

const fakeMember = (perms: string[] = [], roleIds: string[] = []) =>
	({
		permissions: {
			has: (p: string) => perms.includes(p),
		},
		roles: {
			cache: {
				has: (id: string) => roleIds.includes(id),
			},
		},
	}) as unknown as GuildMember;

const fakeUser = (id: string) => ({ id }) as unknown as User;
const fakeGuild = (id: string) => ({ id }) as unknown as Guild;
const fakeInteraction = () => ({}) as unknown as ChatInputCommandInteraction;

const ctx = (overrides: Partial<ValidatorContext> = {}): ValidatorContext => ({
	command: { name: "test", description: "test", run: async () => {} },
	botOwners: [],
	user: fakeUser("user-1"),
	guild: null,
	member: null,
	channelId: "channel-1",
	source: { type: "slash", interaction: fakeInteraction() },
	...overrides,
});

const baseCommand = (overrides: Partial<AnyCommand> = {}): AnyCommand => ({
	name: "test",
	description: "test",
	run: async () => {},
	...overrides,
});

// ─── ownerOnly ──────────────────────────────────────────────────────────────

test("ownerOnly: blocks non-owners", async () => {
	const result = await runValidatorChain(
		ctx({
			user: fakeUser("regular"),
			botOwners: ["owner-1"],
			command: baseCommand({ ownerOnly: true }),
		})
	);
	expect(result.ok).toBe(false);
});

test("ownerOnly: passes for owners", async () => {
	const result = await runValidatorChain(
		ctx({
			user: fakeUser("owner-1"),
			botOwners: ["owner-1"],
			command: baseCommand({ ownerOnly: true }),
		})
	);
	expect(result.ok).toBe(true);
});

test("ownerOnly: is a no-op when not set on the command", async () => {
	const result = await runValidatorChain(ctx({ command: baseCommand() }));
	expect(result.ok).toBe(true);
});

// ─── guildOnly ──────────────────────────────────────────────────────────────

test("guildOnly: blocks DMs", async () => {
	const result = await runValidatorChain(
		ctx({
			guild: null,
			command: baseCommand({ guildOnly: true }),
		})
	);
	expect(result.ok).toBe(false);
});

test("guildOnly: passes inside a guild", async () => {
	const result = await runValidatorChain(
		ctx({
			guild: fakeGuild("g1"),
			command: baseCommand({ guildOnly: true }),
		})
	);
	expect(result.ok).toBe(true);
});

// ─── channelOnly ────────────────────────────────────────────────────────────

test("channelOnly: blocks disallowed channel", async () => {
	const result = await runValidatorChain(
		ctx({
			channelId: "channel-99",
			command: baseCommand({ channels: ["channel-1", "channel-2"] }),
		})
	);
	expect(result.ok).toBe(false);
});

test("channelOnly: passes for allowed channel", async () => {
	const result = await runValidatorChain(
		ctx({
			channelId: "channel-1",
			command: baseCommand({ channels: ["channel-1"] }),
		})
	);
	expect(result.ok).toBe(true);
});

// ─── permissions ────────────────────────────────────────────────────────────

test("permissions: blocks when missing one of the required perms", async () => {
	const result = await runValidatorChain(
		ctx({
			guild: fakeGuild("g1"),
			member: fakeMember(["KickMembers"]),
			command: baseCommand({ permissions: ["KickMembers", "BanMembers"] }),
		})
	);
	expect(result.ok).toBe(false);
});

test("permissions: passes when all required perms are present", async () => {
	const result = await runValidatorChain(
		ctx({
			guild: fakeGuild("g1"),
			member: fakeMember(["KickMembers", "BanMembers"]),
			command: baseCommand({ permissions: ["KickMembers", "BanMembers"] }),
		})
	);
	expect(result.ok).toBe(true);
});

test("permissions: blocks in DM context", async () => {
	const result = await runValidatorChain(
		ctx({
			guild: null,
			command: baseCommand({ permissions: ["KickMembers"] }),
		})
	);
	expect(result.ok).toBe(false);
});

// ─── roles ──────────────────────────────────────────────────────────────────

test("roles: blocks when missing one of the required roles", async () => {
	const result = await runValidatorChain(
		ctx({
			guild: fakeGuild("g1"),
			member: fakeMember([], ["role-1"]),
			command: baseCommand({ roles: ["role-1", "role-2"] }),
		})
	);
	expect(result.ok).toBe(false);
});

test("roles: passes when all required roles are present", async () => {
	const result = await runValidatorChain(
		ctx({
			guild: fakeGuild("g1"),
			member: fakeMember([], ["role-1", "role-2"]),
			command: baseCommand({ roles: ["role-1", "role-2"] }),
		})
	);
	expect(result.ok).toBe(true);
});

// ─── ordering / short-circuit ───────────────────────────────────────────────

test("chain short-circuits on first failure: built-in failure skips later validators", async () => {
	let secondCalled = false;
	const second: Validator = () => {
		secondCalled = true;
		return { ok: true };
	};
	const result = await runValidatorChain(
		ctx({
			guild: null,
			command: baseCommand({ guildOnly: true, validators: [second] }),
		})
	);
	expect(result.ok).toBe(false);
	expect(secondCalled).toBe(false);
});

// ─── custom validators ──────────────────────────────────────────────────────

test("global validators run after built-ins", async () => {
	const order: string[] = [];
	const globalV: Validator = () => {
		order.push("global");
		return { ok: true };
	};
	const cmdV: Validator = () => {
		order.push("cmd");
		return { ok: true };
	};
	const result = await runValidatorChain(
		ctx({
			guild: fakeGuild("g1"),
			command: baseCommand({ guildOnly: true, validators: [cmdV] }),
		}),
		{ globalValidators: [globalV] }
	);
	expect(result.ok).toBe(true);
	expect(order).toEqual(["global", "cmd"]);
});

test("a failing custom validator returns its reason", async () => {
	const failing: Validator = () => ({ ok: false, reason: "custom failure" });
	const result = await runValidatorChain(ctx(), { globalValidators: [failing] });
	expect(result.ok).toBe(false);
	if (!result.ok) expect(result.reason).toBe("custom failure");
});

// ─── canRunCommand hook ────────────────────────────────────────────────────

test("canRunCommand: returning false fails with default reason", async () => {
	const result = await runValidatorChain(ctx(), { canRunCommand: () => false });
	expect(result.ok).toBe(false);
});

test("canRunCommand: returning a string uses it as the reason", async () => {
	const result = await runValidatorChain(ctx(), { canRunCommand: () => "rate limited" });
	expect(result.ok).toBe(false);
	if (!result.ok) expect(result.reason).toBe("rate limited");
});

test("canRunCommand: returning true passes", async () => {
	const result = await runValidatorChain(ctx(), { canRunCommand: () => true });
	expect(result.ok).toBe(true);
});

test("canRunCommand: runs after all other validators", async () => {
	let hookCalled = false;
	const result = await runValidatorChain(
		ctx({
			guild: null,
			command: baseCommand({ guildOnly: true }),
		}),
		{
			canRunCommand: () => {
				hookCalled = true;
				return true;
			},
		}
	);
	expect(result.ok).toBe(false);
	expect(hookCalled).toBe(false);
});
