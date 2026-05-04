import { expect, test } from "bun:test";
import type { Attachment, Message, User } from "discord.js";
import { parseLegacyArgs } from "./legacy-parser";

const fakeMessage = (overrides: { users?: Map<string, unknown>; roles?: Map<string, unknown>; channels?: Map<string, unknown>; attachment?: unknown } = {}) =>
	({
		client: { users: { cache: { get: (id: string) => overrides.users?.get(id) ?? null } } },
		guild: {
			channels: { cache: { get: (id: string) => overrides.channels?.get(id) ?? null } },
			roles: { cache: { get: (id: string) => overrides.roles?.get(id) ?? null } },
		},
		attachments: { first: () => overrides.attachment ?? null },
	}) as unknown as Message;

test("returns empty options when schema is empty", () => {
	const r = parseLegacyArgs([], {}, fakeMessage());
	expect(r.ok).toBe(true);
	if (r.ok) expect(r.options).toEqual({});
});

test("parses a single required string", () => {
	const r = parseLegacyArgs(["hello"], { msg: { type: "string", description: "x", required: true } }, fakeMessage());
	expect(r.ok).toBe(true);
	if (r.ok) expect(r.options).toEqual({ msg: "hello" });
});

test("last string option consumes all remaining tokens", () => {
	const r = parseLegacyArgs(
		["alice", "hello", "world"],
		{
			user: { type: "string", description: "x", required: true },
			body: { type: "string", description: "x", required: true },
		},
		fakeMessage()
	);
	expect(r.ok).toBe(true);
	if (r.ok) expect(r.options).toEqual({ user: "alice", body: "hello world" });
});

test("missing required argument fails with a descriptive error", () => {
	const r = parseLegacyArgs([], { msg: { type: "string", description: "x", required: true } }, fakeMessage());
	expect(r.ok).toBe(false);
	if (!r.ok) expect(r.error).toMatch(/Missing required argument: msg/);
});

test("optional missing argument resolves to undefined", () => {
	const r = parseLegacyArgs([], { msg: { type: "string", description: "x" } }, fakeMessage());
	expect(r.ok).toBe(true);
	if (r.ok) expect(r.options.msg).toBeUndefined();
});

test("integer parses correctly and rejects non-numeric input", () => {
	const ok = parseLegacyArgs(["42"], { n: { type: "integer", description: "n", required: true } }, fakeMessage());
	expect(ok.ok).toBe(true);
	if (ok.ok) expect(ok.options).toEqual({ n: 42 });

	const bad = parseLegacyArgs(["nope"], { n: { type: "integer", description: "n", required: true } }, fakeMessage());
	expect(bad.ok).toBe(false);
});

test("boolean accepts true/false/yes/no/1/0", () => {
	for (const truthy of ["true", "yes", "y", "1", "on"]) {
		const r = parseLegacyArgs([truthy], { b: { type: "boolean", description: "b", required: true } }, fakeMessage());
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.options.b).toBe(true);
	}
	for (const falsy of ["false", "no", "n", "0", "off"]) {
		const r = parseLegacyArgs([falsy], { b: { type: "boolean", description: "b", required: true } }, fakeMessage());
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.options.b).toBe(false);
	}
});

test("string choices: rejects values not in the choice set", () => {
	const ok = parseLegacyArgs(["fast"], { mode: { type: "string", description: "m", choices: ["fast", "slow"], required: true } }, fakeMessage());
	expect(ok.ok).toBe(true);

	const bad = parseLegacyArgs(["medium"], { mode: { type: "string", description: "m", choices: ["fast", "slow"], required: true } }, fakeMessage());
	expect(bad.ok).toBe(false);
});

test("user mention resolves to a User from client cache", () => {
	const id = "123456789012345678";
	const fakeUser = { id, tag: "Alice" } as unknown as User;
	const r = parseLegacyArgs([`<@${id}>`], { who: { type: "user", description: "w", required: true } }, fakeMessage({ users: new Map([[id, fakeUser]]) }));
	expect(r.ok).toBe(true);
	if (r.ok) expect(r.options.who).toBe(fakeUser);
});

test("user raw ID resolves to a User from client cache", () => {
	const fakeUser = { id: "12345678901234567" } as unknown as User;
	const r = parseLegacyArgs(
		["12345678901234567"],
		{ who: { type: "user", description: "w", required: true } },
		fakeMessage({ users: new Map([["12345678901234567", fakeUser]]) })
	);
	expect(r.ok).toBe(true);
	if (r.ok) expect(r.options.who).toBe(fakeUser);
});

test("attachment option pulls from message.attachments without consuming tokens", () => {
	const fakeAtt = { id: "att-1", url: "..." } as unknown as Attachment;
	const r = parseLegacyArgs([], { file: { type: "attachment", description: "f", required: true } }, fakeMessage({ attachment: fakeAtt }));
	expect(r.ok).toBe(true);
	if (r.ok) expect(r.options.file).toBe(fakeAtt);
});
