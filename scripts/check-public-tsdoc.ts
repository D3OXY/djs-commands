import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

type PackageConfig = {
	name: string;
	files: readonly string[];
};

const root = process.cwd();

const packages: readonly PackageConfig[] = [
	{
		name: "@djs-commands/core",
		files: [
			"packages/core/src/components.ts",
			"packages/core/src/context.ts",
			"packages/core/src/cooldowns.ts",
			"packages/core/src/define-command.ts",
			"packages/core/src/define-event.ts",
			"packages/core/src/fs-loader.ts",
			"packages/core/src/handler.ts",
			"packages/core/src/legacy-parser.ts",
			"packages/core/src/options.ts",
			"packages/core/src/plugin.ts",
			"packages/core/src/registration.ts",
			"packages/core/src/storage.ts",
			"packages/core/src/storage-conformance.ts",
			"packages/core/src/types.ts",
			"packages/core/src/validators.ts",
		],
	},
	{
		name: "@djs-commands/jsx",
		files: [
			"packages/jsx/src/components/display.ts",
			"packages/jsx/src/components/forms.ts",
			"packages/jsx/src/jsx-dev-runtime.ts",
			"packages/jsx/src/jsx-runtime.ts",
			"packages/jsx/src/render.ts",
		],
	},
	{
		name: "@djs-commands/adapter-drizzle",
		files: ["packages/adapter-drizzle/src/index.ts"],
	},
	{
		name: "@djs-commands/adapter-mongoose",
		files: ["packages/adapter-mongoose/src/index.ts"],
	},
	{
		name: "@djs-commands/adapter-prisma",
		files: ["packages/adapter-prisma/src/index.ts"],
	},
	{
		name: "@djs-commands/adapter-redis",
		files: ["packages/adapter-redis/src/redis-cache-adapter.ts"],
	},
	{
		name: "create-djs-commands",
		files: ["packages/create-djs-commands/src/options.ts", "packages/create-djs-commands/src/scaffold.ts"],
	},
];

const missing: string[] = [];

for (const pkg of packages) {
	for (const file of pkg.files) {
		const absolute = join(root, file);
		if (!existsSync(absolute)) continue;
		const source = ts.createSourceFile(absolute, readFileSync(absolute, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
		checkSourceFile(pkg.name, source);
	}
}

if (missing.length > 0) {
	console.error("Missing public TSDoc:");
	for (const item of missing) console.error(`  - ${item}`);
	process.exit(1);
}

console.log("Public TSDoc coverage OK");

function checkSourceFile(packageName: string, source: ts.SourceFile): void {
	for (const statement of source.statements) {
		if (isExportedDeclaration(statement)) checkDeclaration(packageName, source, statement);
	}
}

function checkDeclaration(packageName: string, source: ts.SourceFile, node: ExportedDeclaration): void {
	if (hasInternalTag(node) || isDefaultExportOnly(node)) return;
	const name = declarationName(node);
	if (name && !hasTsDoc(source, node)) report(packageName, source, node, name);

	if (ts.isInterfaceDeclaration(node)) {
		for (const member of node.members) checkMember(packageName, source, member, name);
	}

	if (ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)) {
		for (const member of node.type.members) checkMember(packageName, source, member, name);
	}
}

function checkMember(packageName: string, source: ts.SourceFile, member: ts.TypeElement | ts.ClassElement, parentName: string | null): void {
	if (hasInternalTag(member)) return;
	if (!hasName(member)) return;
	const memberName = member.name.getText(source);
	if (!hasTsDoc(source, member)) report(packageName, source, member, parentName ? `${parentName}.${memberName}` : memberName);
}

type ExportedDeclaration = ts.FunctionDeclaration | ts.ClassDeclaration | ts.InterfaceDeclaration | ts.TypeAliasDeclaration | ts.EnumDeclaration | ts.VariableStatement;

function isExportedDeclaration(node: ts.Node): node is ExportedDeclaration {
	if (
		ts.isFunctionDeclaration(node) ||
		ts.isClassDeclaration(node) ||
		ts.isInterfaceDeclaration(node) ||
		ts.isTypeAliasDeclaration(node) ||
		ts.isEnumDeclaration(node) ||
		ts.isVariableStatement(node)
	) {
		return hasExportModifier(node);
	}
	return false;
}

function hasExportModifier(node: ts.Node): boolean {
	return Boolean(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function isDefaultExportOnly(node: ExportedDeclaration): boolean {
	return Boolean(ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword));
}

function declarationName(node: ExportedDeclaration): string | null {
	if (ts.isVariableStatement(node)) {
		return node.declarationList.declarations.map((declaration) => declaration.name.getText()).join(", ");
	}
	return node.name?.getText() ?? null;
}

function hasName(node: ts.Node): node is ts.Node & { name: ts.PropertyName } {
	return "name" in node && Boolean((node as { name?: unknown }).name);
}

function hasInternalTag(node: ts.Node): boolean {
	return ts.getJSDocTags(node).some((tag) => tag.tagName.getText() === "internal");
}

function hasTsDoc(source: ts.SourceFile, node: ts.Node): boolean {
	const comments = ts.getLeadingCommentRanges(source.text, node.getFullStart()) ?? [];
	if (comments.some((comment) => source.text.slice(comment.pos, comment.end).startsWith("/**"))) return true;
	return ts.getJSDocCommentsAndTags(node).length > 0;
}

function report(packageName: string, source: ts.SourceFile, node: ts.Node, name: string): void {
	const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source));
	missing.push(`${packageName} ${name} (${relative(root, source.fileName)}:${line + 1}:${character + 1})`);
}
