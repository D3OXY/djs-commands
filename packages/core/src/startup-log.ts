import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pico from "picocolors";
import type { HandlerRegistrationConfig, RegistrationPlan } from "./registration";
import type { StartupLogConfig, StorageFeaturesConfig } from "./types";

interface StartupLogInput {
	version?: string;
	bot?: string;
	commandCount: number;
	registration: HandlerRegistrationConfig | undefined;
	registrationPlan: RegistrationPlan;
	legacy: {
		enabled: boolean;
		prefix: string;
	};
	storage: {
		configured: boolean;
		features: Required<StorageFeaturesConfig>;
	};
	cacheConfigured: boolean;
	dev: boolean;
}

interface FormatOptions {
	isTTY?: boolean;
}

interface ResolvedStartupLogConfig {
	style: "box" | "line";
	useColor: boolean;
}

const UNKNOWN_VERSION = "unknown";

/** Reads the installed `@djs-commands/core` package version for startup diagnostics. */
export function getCoreVersion(): string {
	try {
		const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), "../package.json");
		const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8")) as { version?: unknown };
		return typeof pkg.version === "string" ? pkg.version : UNKNOWN_VERSION;
	} catch {
		return UNKNOWN_VERSION;
	}
}

/** Formats the startup banner printed by `createCommandHandler` after boot and registration complete. */
export function formatStartupLog(input: StartupLogInput, config: StartupLogConfig | undefined, options: FormatOptions = {}): string | null {
	const resolved = resolveStartupLogConfig(config, options);
	if (!resolved) return null;

	const rows: [string, string][] = [
		["Version", input.version ?? UNKNOWN_VERSION],
		["Bot", input.bot ?? "unknown"],
		["Commands", `${input.commandCount} loaded`],
		["Registration", formatRegistration(input.registration, input.registrationPlan)],
		["Legacy", input.legacy.enabled ? `enabled, prefix "${input.legacy.prefix}"` : "disabled"],
		["Storage", formatStorage(input.storage)],
		["Cache", input.cacheConfigured ? "configured" : "memory"],
		["Dev", input.dev ? "hot reload enabled" : "production mode"],
	];

	return resolved.style === "box" ? formatBox(rows, resolved.useColor) : formatLine(rows, resolved.useColor);
}

function resolveStartupLogConfig(config: StartupLogConfig | undefined, options: FormatOptions): ResolvedStartupLogConfig | null {
	if (config === false) return null;
	if (typeof config === "object" && config.enabled === false) return null;

	const isTTY = options.isTTY ?? process.stdout.isTTY === true;
	const style = typeof config === "string" ? config : typeof config === "object" ? config.style : undefined;

	return {
		style: style ?? (isTTY ? "box" : "line"),
		useColor: isTTY,
	};
}

function formatBox(rows: readonly [string, string][], useColor: boolean): string {
	const title = "DJS Commands";
	const labelWidth = Math.max(...rows.map(([label]) => label.length));
	const valueWidth = Math.max(...rows.map(([, value]) => value.length));
	const contentWidth = Math.max(title.length + 2, labelWidth + 2 + valueWidth);
	const top = `╭─ ${title} ${"─".repeat(Math.max(0, contentWidth - title.length - 1))}╮`;
	const bottom = `╰${"─".repeat(contentWidth + 2)}╯`;
	const lines = rows.map(([label, value]) => {
		const formattedLabel = useColor ? pico.bold(label.padEnd(labelWidth)) : label.padEnd(labelWidth);
		return `│ ${formattedLabel}  ${value.padEnd(valueWidth)} │`;
	});

	if (!useColor) return [top, ...lines, bottom].join("\n");
	return [pico.cyan(top), ...lines, pico.cyan(bottom)].join("\n");
}

function formatLine(rows: readonly [string, string][], useColor: boolean): string {
	const prefix = useColor ? pico.cyan("[djs-commands] ready") : "[djs-commands] ready";
	const fields = rows.map(([label, value]) => `${label.toLowerCase()} ${value}`);
	return [prefix, ...fields].join(" | ");
}

function formatRegistration(registration: HandlerRegistrationConfig | undefined, plan: RegistrationPlan): string {
	if (registration === false || registration?.enabled === false) return "disabled";
	if (plan.operations.length === 0) return "ignored";

	const parts: string[] = [];
	const global = plan.operations.find((operation) => operation.scope === "global");
	if (global) {
		parts.push(`global ${global.mode}: ${global.commands.length}`);
	}

	const guildCounts = plan.operations
		.filter((operation) => operation.scope === "guild")
		.reduce(
			(acc, operation) => {
				acc[operation.mode] += 1;
				return acc;
			},
			{ clear: 0, sync: 0 }
		);

	if (guildCounts.sync > 0) parts.push(`guild sync: ${guildCounts.sync}`);
	if (guildCounts.clear > 0) parts.push(`guild clear: ${guildCounts.clear}`);

	return parts.join(", ");
}

function formatStorage(storage: StartupLogInput["storage"]): string {
	if (!storage.configured) return "not configured";

	const features: string[] = [];
	if (storage.features.guildPrefixes) features.push("guild prefixes");
	if (storage.features.disabledCommands) features.push("disabled commands");
	if (storage.features.channelLocks) features.push("channel locks");

	if (features.length === 0) return "configured";
	return `configured (${features.join(", ")})`;
}
