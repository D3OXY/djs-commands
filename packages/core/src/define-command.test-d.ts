import type { Attachment, GuildBasedChannel, GuildMember, Role, User } from "discord.js";
import { expectTypeOf } from "expect-type";
import { defineCommand } from "./define-command";

// String — required: typed as string
defineCommand({
	name: "string-required",
	description: "test",
	options: { x: { type: "string", description: "x", required: true } },
	run: ({ options }) => {
		expectTypeOf(options.x).toEqualTypeOf<string>();
	},
});

// String — optional: typed as string | undefined
defineCommand({
	name: "string-optional",
	description: "test",
	options: { x: { type: "string", description: "x" } },
	run: ({ options }) => {
		expectTypeOf(options.x).toEqualTypeOf<string | undefined>();
	},
});

// String — with `as const` choices: narrowed to the union
defineCommand({
	name: "string-choices",
	description: "test",
	options: {
		mode: { type: "string", description: "m", choices: ["fast", "slow"] as const, required: true },
	},
	run: ({ options }) => {
		expectTypeOf(options.mode).toEqualTypeOf<"fast" | "slow">();
	},
});

// String — choices without required: narrowed but optional
defineCommand({
	name: "string-choices-optional",
	description: "test",
	options: {
		mode: { type: "string", description: "m", choices: ["fast", "slow"] as const },
	},
	run: ({ options }) => {
		expectTypeOf(options.mode).toEqualTypeOf<"fast" | "slow" | undefined>();
	},
});

// Integer — required and with choices
defineCommand({
	name: "integer-required",
	description: "test",
	options: { n: { type: "integer", description: "n", required: true } },
	run: ({ options }) => {
		expectTypeOf(options.n).toEqualTypeOf<number>();
	},
});

defineCommand({
	name: "integer-choices",
	description: "test",
	options: { n: { type: "integer", description: "n", choices: [1, 2, 3] as const, required: true } },
	run: ({ options }) => {
		expectTypeOf(options.n).toEqualTypeOf<1 | 2 | 3>();
	},
});

// Number, boolean
defineCommand({
	name: "number-required",
	description: "test",
	options: { n: { type: "number", description: "n", required: true } },
	run: ({ options }) => {
		expectTypeOf(options.n).toEqualTypeOf<number>();
	},
});

defineCommand({
	name: "boolean-optional",
	description: "test",
	options: { b: { type: "boolean", description: "b" } },
	run: ({ options }) => {
		expectTypeOf(options.b).toEqualTypeOf<boolean | undefined>();
	},
});

// User, channel, role, mentionable, attachment
defineCommand({
	name: "user-required",
	description: "test",
	options: { u: { type: "user", description: "u", required: true } },
	run: ({ options }) => {
		expectTypeOf(options.u).toEqualTypeOf<User>();
	},
});

defineCommand({
	name: "channel-optional",
	description: "test",
	options: { c: { type: "channel", description: "c" } },
	run: ({ options }) => {
		expectTypeOf(options.c).toEqualTypeOf<GuildBasedChannel | undefined>();
	},
});

defineCommand({
	name: "role-required",
	description: "test",
	options: { r: { type: "role", description: "r", required: true } },
	run: ({ options }) => {
		expectTypeOf(options.r).toEqualTypeOf<Role>();
	},
});

defineCommand({
	name: "mentionable-required",
	description: "test",
	options: { m: { type: "mentionable", description: "m", required: true } },
	run: ({ options }) => {
		expectTypeOf(options.m).toEqualTypeOf<User | GuildMember | Role>();
	},
});

defineCommand({
	name: "attachment-optional",
	description: "test",
	options: { a: { type: "attachment", description: "a" } },
	run: ({ options }) => {
		expectTypeOf(options.a).toEqualTypeOf<Attachment | undefined>();
	},
});

// No options — options is an empty record
defineCommand({
	name: "no-options",
	description: "test",
	run: ({ options }) => {
		expectTypeOf(options).toEqualTypeOf<Record<string, never>>();
	},
});

// Multiple options — each individually typed
defineCommand({
	name: "multi",
	description: "test",
	options: {
		who: { type: "user", description: "who", required: true },
		why: { type: "string", description: "why" },
		count: { type: "integer", description: "count", choices: [1, 2, 3] as const },
	},
	run: ({ options }) => {
		expectTypeOf(options.who).toEqualTypeOf<User>();
		expectTypeOf(options.why).toEqualTypeOf<string | undefined>();
		expectTypeOf(options.count).toEqualTypeOf<1 | 2 | 3 | undefined>();
	},
});
