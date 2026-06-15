import { describe, expect, test } from "bun:test";
import { formatStartupLog } from "./startup-log";

const baseInput = {
	bot: "TestBot#0001",
	cacheConfigured: false,
	commandCount: 3,
	dev: true,
	legacy: { enabled: true, prefix: "!" },
	registration: { guilds: ["guild-1"] },
	registrationPlan: {
		operations: [
			{
				commands: [
					{ description: "Ping", name: "ping" },
					{ description: "Role", name: "role" },
					{ description: "Snipe", name: "snipe" },
				],
				guildId: "guild-1",
				mode: "sync",
				scope: "guild",
			},
		],
	},
	storage: {
		configured: true,
		features: { channelLocks: false, disabledCommands: false, guildPrefixes: true },
	},
	version: "3.0.1",
} satisfies Parameters<typeof formatStartupLog>[0];

describe("startup log formatting", () => {
	test("formats a compact line for non-TTY output", () => {
		const output = formatStartupLog(baseInput, true, { isTTY: false });

		expect(output).toContain("[djs-commands] ready");
		expect(output).toContain("version 3.0.1");
		expect(output).toContain("bot TestBot#0001");
		expect(output).toContain("commands 3 loaded");
		expect(output).toContain("registration guild sync: 1");
		expect(output).toContain('legacy enabled, prefix "!"');
		expect(output).toContain("storage configured (guild prefixes)");
	});

	test("formats a boxed summary when requested", () => {
		const output = formatStartupLog(baseInput, "box", { isTTY: false });

		expect(output).toContain("╭─ DJS Commands");
		expect(output).toContain("│ Version");
		expect(output).toContain("3.0.1");
		expect(output).toContain("╰");
	});

	test("returns null when disabled", () => {
		expect(formatStartupLog(baseInput, false, { isTTY: false })).toBeNull();
		expect(formatStartupLog(baseInput, { enabled: false }, { isTTY: false })).toBeNull();
	});

	test("summarizes disabled registration", () => {
		const output = formatStartupLog({ ...baseInput, registration: false, registrationPlan: { operations: [] } }, "line", { isTTY: false });

		expect(output).toContain("registration disabled");
	});
});
