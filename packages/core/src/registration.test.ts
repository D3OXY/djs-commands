import { describe, expect, test } from "bun:test";
import { createRegistrationPlan } from "./registration";
import type { AnyCommand } from "./types";

const command = (name: string, registration?: AnyCommand["registration"]): AnyCommand => ({
	name,
	description: `${name} command`,
	registration,
	run: () => {},
});

const commandNames = (commands: readonly unknown[]) => (commands as readonly { name: string }[]).map((entry) => entry.name);

describe("registration planning", () => {
	test("defaults to global sync", () => {
		const plan = createRegistrationPlan([command("ping")]);

		expect(plan.operations).toHaveLength(1);
		expect(plan.operations[0]).toMatchObject({ scope: "global", mode: "sync" });
		expect(commandNames(plan.operations[0]?.commands ?? [])).toEqual(["ping"]);
	});

	test("plans global clear", () => {
		const plan = createRegistrationPlan([command("ping")], { global: "clear" });

		expect(plan.operations).toEqual([{ scope: "global", mode: "clear", commands: [] }]);
	});

	test("plans guild sync", () => {
		const plan = createRegistrationPlan([command("ping")], { guilds: ["guild-1"] });

		expect(plan.operations).toHaveLength(1);
		expect(plan.operations[0]).toMatchObject({ scope: "guild", guildId: "guild-1", mode: "sync" });
		expect(commandNames(plan.operations[0]?.commands ?? [])).toEqual(["ping"]);
	});

	test("plans guild clear", () => {
		const plan = createRegistrationPlan([command("ping")], { guilds: [{ id: "guild-1", mode: "clear" }] });

		expect(plan.operations).toEqual([{ scope: "guild", guildId: "guild-1", mode: "clear", commands: [] }]);
	});

	test("plans combined global and guild sync", () => {
		const plan = createRegistrationPlan([command("ping")], { global: "sync", guilds: ["guild-1"] });

		expect(plan.operations.map((operation) => operation.scope)).toEqual(["global", "guild"]);
		expect(plan.operations[1]).toMatchObject({ scope: "guild", guildId: "guild-1", mode: "sync" });
	});

	test("does not touch ignored or omitted scopes", () => {
		const ignored = createRegistrationPlan([command("ping")], { global: "ignore", guilds: [{ id: "guild-1", mode: "ignore" }] });
		const omittedGlobal = createRegistrationPlan([command("ping")], { guilds: ["guild-1"] });

		expect(ignored.operations).toEqual([]);
		expect(omittedGlobal.operations.some((operation) => operation.scope === "global")).toBe(false);
	});

	test("supports guild-only command registration", () => {
		const plan = createRegistrationPlan([command("public"), command("admin", { global: false, guilds: ["guild-1"] })], {
			global: "sync",
			guilds: ["guild-1", "guild-2"],
		});

		expect(commandNames(plan.operations[0]?.commands ?? [])).toEqual(["public"]);
		expect(commandNames(plan.operations[1]?.commands ?? [])).toEqual(["public", "admin"]);
		expect(commandNames(plan.operations[2]?.commands ?? [])).toEqual(["public"]);
	});

	test("registration false excludes command from all auto-registration scopes", () => {
		const plan = createRegistrationPlan([command("runtime-only", false)], { global: "sync", guilds: ["guild-1"] });

		expect(plan.operations.every((operation) => operation.commands.length === 0)).toBe(true);
	});
});
