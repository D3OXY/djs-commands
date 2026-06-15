import type { Message } from "discord.js";
import type { CommandOption, CommandOptions, ResolveOptions } from "./options";

/** Result of parsing legacy positional tokens into typed command options. */
export type LegacyParseResult<S extends CommandOptions> = { ok: true; options: ResolveOptions<S> } | { ok: false; error: string };

const USER_MENTION = /^<@!?(\d+)>$/;
const CHANNEL_MENTION = /^<#(\d+)>$/;
const ROLE_MENTION = /^<@&(\d+)>$/;
const RAW_ID = /^(\d{17,20})$/;
const TRUE_VALUES = new Set(["true", "yes", "y", "1", "on"]);
const FALSE_VALUES = new Set(["false", "no", "n", "0", "off"]);

/**
 * Parses positional argument tokens into a typed options object that matches
 * a slash command's option schema. Tokens come from `message.content` already
 * stripped of the prefix and command name (split by whitespace).
 *
 * Supported types: string, integer, number, boolean, user, channel, role,
 * mentionable. Attachment options consume `message.attachments.first()` and
 * do not advance the token cursor.
 *
 * Heuristic: when the LAST option is a string, it consumes all remaining
 * tokens joined by spaces (so `!echo hello world` works for `{ message: string }`).
 */
export function parseLegacyArgs<S extends CommandOptions>(tokens: string[], schema: S | undefined, message: Message): LegacyParseResult<S> {
	if (!schema || Object.keys(schema).length === 0) {
		return { ok: true, options: {} as ResolveOptions<S> };
	}

	const result: Record<string, unknown> = {};
	const queue = [...tokens];
	const entries = Object.entries(schema);
	const lastIndex = entries.length - 1;

	for (let i = 0; i < entries.length; i++) {
		const entry = entries[i];
		if (!entry) continue;
		const [name, opt] = entry;
		const required = opt.required === true;

		if (opt.type === "attachment") {
			const att = message.attachments.first();
			if (att) result[name] = att;
			else if (required) return { ok: false, error: `Missing required attachment: ${name}` };
			continue;
		}

		if (queue.length === 0) {
			if (required) return { ok: false, error: `Missing required argument: ${name}` };
			continue;
		}

		const isLast = i === lastIndex;
		const raw = opt.type === "string" && isLast ? queue.splice(0).join(" ") : (queue.shift() ?? "");

		const parsed = parseValue(opt, raw, message);
		if (!parsed.ok) return { ok: false, error: `${name}: ${parsed.error}` };
		result[name] = parsed.value;
	}

	return { ok: true, options: result as ResolveOptions<S> };
}

function parseValue(opt: CommandOption, raw: string, message: Message): { ok: true; value: unknown } | { ok: false; error: string } {
	switch (opt.type) {
		case "string": {
			if (opt.choices && !opt.choices.includes(raw)) {
				return { ok: false, error: `must be one of ${opt.choices.join(", ")}` };
			}
			return { ok: true, value: raw };
		}
		case "integer": {
			const n = Number.parseInt(raw, 10);
			if (Number.isNaN(n)) return { ok: false, error: `expected an integer, got "${raw}"` };
			if (opt.choices && !opt.choices.includes(n)) {
				return { ok: false, error: `must be one of ${opt.choices.join(", ")}` };
			}
			return { ok: true, value: n };
		}
		case "number": {
			const n = Number.parseFloat(raw);
			if (Number.isNaN(n)) return { ok: false, error: `expected a number, got "${raw}"` };
			return { ok: true, value: n };
		}
		case "boolean": {
			const lower = raw.toLowerCase();
			if (TRUE_VALUES.has(lower)) return { ok: true, value: true };
			if (FALSE_VALUES.has(lower)) return { ok: true, value: false };
			return { ok: false, error: `expected true/false, got "${raw}"` };
		}
		case "user": {
			const id = extractId(raw, USER_MENTION);
			if (!id) return { ok: false, error: `expected a user mention or ID, got "${raw}"` };
			const user = message.client.users.cache.get(id);
			if (!user) return { ok: false, error: `user not found: ${id}` };
			return { ok: true, value: user };
		}
		case "channel": {
			const id = extractId(raw, CHANNEL_MENTION);
			if (!id) return { ok: false, error: `expected a channel mention or ID, got "${raw}"` };
			const channel = message.guild?.channels.cache.get(id);
			if (!channel) return { ok: false, error: `channel not found: ${id}` };
			return { ok: true, value: channel };
		}
		case "role": {
			const id = extractId(raw, ROLE_MENTION);
			if (!id) return { ok: false, error: `expected a role mention or ID, got "${raw}"` };
			const role = message.guild?.roles.cache.get(id);
			if (!role) return { ok: false, error: `role not found: ${id}` };
			return { ok: true, value: role };
		}
		case "mentionable": {
			const userId = extractId(raw, USER_MENTION);
			if (userId) {
				const user = message.client.users.cache.get(userId);
				if (user) return { ok: true, value: user };
			}
			const roleId = extractId(raw, ROLE_MENTION);
			if (roleId) {
				const role = message.guild?.roles.cache.get(roleId);
				if (role) return { ok: true, value: role };
			}
			const rawId = extractId(raw, RAW_ID);
			if (rawId) {
				const user = message.client.users.cache.get(rawId);
				if (user) return { ok: true, value: user };
				const role = message.guild?.roles.cache.get(rawId);
				if (role) return { ok: true, value: role };
			}
			return { ok: false, error: `expected a user/role mention or ID, got "${raw}"` };
		}
		case "attachment":
			return { ok: false, error: "attachment values come from message.attachments, not args" };
	}
}

function extractId(raw: string, pattern: RegExp): string | null {
	const match = pattern.exec(raw) ?? RAW_ID.exec(raw);
	return match?.[1] ?? null;
}
