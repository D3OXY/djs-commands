import pico from "picocolors";
import { HELP_TEXT, parseFlags } from "./options";
import { scaffold } from "./scaffold";
import { runWizard } from "./wizard";

async function main(): Promise<void> {
	const flags = parseFlags(process.argv.slice(2));

	if (flags.help) {
		console.log(HELP_TEXT);
		return;
	}

	const opts = await runWizard(flags);
	const result = await scaffold(opts, { skipInstall: flags.skipInstall === true });

	console.log();
	console.log(pico.green("✓ Created"), pico.bold(result.targetDir));
	console.log();
	console.log("Next steps:");
	console.log(pico.dim(`  cd ${opts.projectName}`));
	console.log(pico.dim("  cp .env.example .env  # add DISCORD_TOKEN"));
	const dev = opts.packageManager === "bun" ? "bun run dev" : opts.packageManager === "pnpm" ? "pnpm dev" : "npm run dev";
	console.log(pico.dim(`  ${dev}`));
	console.log();
}

main().catch((err) => {
	console.error(pico.red("✗"), err instanceof Error ? err.message : String(err));
	process.exit(1);
});
