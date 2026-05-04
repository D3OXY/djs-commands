import { expect, test } from "bun:test";
import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import type { AnyCommand } from "./types";
import { runValidatorChain, type Validator } from "./validators";

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

const fakeInteraction = (
	overrides: Partial<{
		commandName: string;
		channelId: string;
		user: { id: string };
		guild: object | null;
		member: GuildMember | null;
	}> = {}
) =>
	({
		commandName: "test",
		channelId: "channel-1",
		user: { id: "user-1" },
		guild: null,
		member: null,
		...overrides,
	}) as unknown as ChatInputCommandInteraction;

const baseCommand = (overrides: Partial<AnyCommand> = {}): AnyCommand => ({
	name: "test",
	description: "test",
	run: async () => {},
	...overrides,
});

// ─── ownerOnly ──────────────────────────────────────────────────────────────

test("ownerOnly: blocks non-owners", async () => {
	const result = await runValidatorChain({
		interaction: fakeInteraction({ user: { id: "regular" } }),
		command: baseCommand({ ownerOnly: true }),
		botOwners: ["owner-1"],
	});
	expect(result.ok).toBe(false);
});

test("ownerOnly: passes for owners", async () => {
	const result = await runValidatorChain({
		interaction: fakeInteraction({ user: { id: "owner-1" } }),
		command: baseCommand({ ownerOnly: true }),
		botOwners: ["owner-1"],
	});
	expect(result.ok).toBe(true);
});

test("ownerOnly: is a no-op when not set on the command", async () => {
	const result = await runValidatorChain({
		interaction: fakeInteraction(),
		command: baseCommand(),
		botOwners: [],
	});
	expect(result.ok).toBe(true);
});

// ─── guildOnly ──────────────────────────────────────────────────────────────

test("guildOnly: blocks DMs", async () => {
	const result = await runValidatorChain({
		interaction: fakeInteraction({ guild: null }),
		command: baseCommand({ guildOnly: true }),
		botOwners: [],
	});
	expect(result.ok).toBe(false);
});

test("guildOnly: passes inside a guild", async () => {
	const result = await runValidatorChain({
		interaction: fakeInteraction({ guild: { id: "g1" } }),
		command: baseCommand({ guildOnly: true }),
		botOwners: [],
	});
	expect(result.ok).toBe(true);
});

// ─── channelOnly ────────────────────────────────────────────────────────────

test("channelOnly: blocks disallowed channel", async () => {
	const result = await runValidatorChain({
		interaction: fakeInteraction({ channelId: "channel-99" }),
		command: baseCommand({ channels: ["channel-1", "channel-2"] }),
		botOwners: [],
	});
	expect(result.ok).toBe(false);
});

test("channelOnly: passes for allowed channel", async () => {
	const result = await runValidatorChain({
		interaction: fakeInteraction({ channelId: "channel-1" }),
		command: baseCommand({ channels: ["channel-1"] }),
		botOwners: [],
	});
	expect(result.ok).toBe(true);
});

// ─── permissions ────────────────────────────────────────────────────────────

test("permissions: blocks when missing one of the required perms", async () => {
	const result = await runValidatorChain({
		interaction: fakeInteraction({
			guild: { id: "g1" },
			member: fakeMember(["KickMembers"]),
		}),
		command: baseCommand({ permissions: ["KickMembers", "BanMembers"] }),
		botOwners: [],
	});
	expect(result.ok).toBe(false);
});

test("permissions: passes when all required perms are present", async () => {
	const result = await runValidatorChain({
		interaction: fakeInteraction({
			guild: { id: "g1" },
			member: fakeMember(["KickMembers", "BanMembers"]),
		}),
		command: baseCommand({ permissions: ["KickMembers", "BanMembers"] }),
		botOwners: [],
	});
	expect(result.ok).toBe(true);
});

test("permissions: blocks in DM context", async () => {
	const result = await runValidatorChain({
		interaction: fakeInteraction({ guild: null }),
		command: baseCommand({ permissions: ["KickMembers"] }),
		botOwners: [],
	});
	expect(result.ok).toBe(false);
});

// ─── roles ──────────────────────────────────────────────────────────────────

test("roles: blocks when missing one of the required roles", async () => {
	const result = await runValidatorChain({
		interaction: fakeInteraction({
			guild: { id: "g1" },
			member: fakeMember([], ["role-1"]),
		}),
		command: baseCommand({ roles: ["role-1", "role-2"] }),
		botOwners: [],
	});
	expect(result.ok).toBe(false);
});

test("roles: passes when all required roles are present", async () => {
	const result = await runValidatorChain({
		interaction: fakeInteraction({
			guild: { id: "g1" },
			member: fakeMember([], ["role-1", "role-2"]),
		}),
		command: baseCommand({ roles: ["role-1", "role-2"] }),
		botOwners: [],
	});
	expect(result.ok).toBe(true);
});

// ─── ordering / short-circuit ───────────────────────────────────────────────

test("chain short-circuits on first failure: built-in failure skips later validators", async () => {
	let secondCalled = false;
	const second: Validator = () => {
		secondCalled = true;
		return { ok: true };
	};
	const result = await runValidatorChain({
		interaction: fakeInteraction({ guild: null }),
		command: baseCommand({ guildOnly: true, validators: [second] }),
		botOwners: [],
	});
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
		{
			interaction: fakeInteraction({ guild: { id: "g1" } }),
			command: baseCommand({ guildOnly: true, validators: [cmdV] }),
			botOwners: [],
		},
		{ globalValidators: [globalV] }
	);
	expect(result.ok).toBe(true);
	expect(order).toEqual(["global", "cmd"]);
});

test("a failing custom validator returns its reason", async () => {
	const failing: Validator = () => ({ ok: false, reason: "custom failure" });
	const result = await runValidatorChain(
		{
			interaction: fakeInteraction(),
			command: baseCommand(),
			botOwners: [],
		},
		{ globalValidators: [failing] }
	);
	expect(result.ok).toBe(false);
	if (!result.ok) expect(result.reason).toBe("custom failure");
});

// ─── canRunCommand hook ────────────────────────────────────────────────────

test("canRunCommand: returning false fails with default reason", async () => {
	const result = await runValidatorChain(
		{
			interaction: fakeInteraction(),
			command: baseCommand(),
			botOwners: [],
		},
		{ canRunCommand: () => false }
	);
	expect(result.ok).toBe(false);
});

test("canRunCommand: returning a string uses it as the reason", async () => {
	const result = await runValidatorChain(
		{
			interaction: fakeInteraction(),
			command: baseCommand(),
			botOwners: [],
		},
		{ canRunCommand: () => "rate limited" }
	);
	expect(result.ok).toBe(false);
	if (!result.ok) expect(result.reason).toBe("rate limited");
});

test("canRunCommand: returning true passes", async () => {
	const result = await runValidatorChain(
		{
			interaction: fakeInteraction(),
			command: baseCommand(),
			botOwners: [],
		},
		{ canRunCommand: () => true }
	);
	expect(result.ok).toBe(true);
});

test("canRunCommand: runs after all other validators", async () => {
	let hookCalled = false;
	const result = await runValidatorChain(
		{
			interaction: fakeInteraction({ guild: null }),
			command: baseCommand({ guildOnly: true }),
			botOwners: [],
		},
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
