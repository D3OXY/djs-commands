import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { ScaffoldOptions } from "./options";
import { buildFiles, installCommand } from "./templates";

interface ScaffoldResult {
	targetDir: string;
	files: string[];
}

interface ScaffoldRunOptions {
	cwd?: string;
	skipInstall?: boolean;
	stdio?: "inherit" | "ignore";
}

/** Writes a new bot project to disk using resolved scaffold options. */
export async function scaffold(opts: ScaffoldOptions, runOpts: ScaffoldRunOptions = {}): Promise<ScaffoldResult> {
	const cwd = runOpts.cwd ?? process.cwd();
	const targetDir = resolve(cwd, opts.projectName);

	await mkdir(targetDir, { recursive: true });

	const files = buildFiles(opts);
	const writtenPaths: string[] = [];
	for (const file of files) {
		const fullPath = join(targetDir, file.path);
		await mkdir(dirname(fullPath), { recursive: true });
		await writeFile(fullPath, file.content);
		writtenPaths.push(file.path);
	}

	if (!runOpts.skipInstall) {
		const { cmd, args } = installCommand(opts.packageManager);
		await runCommand(cmd, args, { cwd: targetDir, stdio: runOpts.stdio ?? "inherit" });
	}

	if (opts.initGit) {
		try {
			await runCommand("git", ["init", "--quiet"], { cwd: targetDir, stdio: runOpts.stdio ?? "ignore" });
		} catch {
			// git not installed or some other failure — non-fatal
		}
	}

	return { targetDir, files: writtenPaths };
}

function runCommand(cmd: string, args: string[], opts: { cwd: string; stdio: "inherit" | "ignore" }): Promise<void> {
	return new Promise((resolveRun, rejectRun) => {
		const child = spawn(cmd, args, { cwd: opts.cwd, stdio: opts.stdio });
		child.on("close", (code) => {
			if (code === 0) resolveRun();
			else rejectRun(new Error(`${cmd} exited with code ${code}`));
		});
		child.on("error", rejectRun);
	});
}
